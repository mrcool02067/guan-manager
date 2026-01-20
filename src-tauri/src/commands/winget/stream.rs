use crate::models::*;
use crate::state::ExecState;
use crate::utils::{
  command_spawn_piped_logged, command_wait_logged, default_exec_flags_for, pipe_reader_logged,
};
use tauri::{Emitter, State, Window};

/// 流式下载软件包（带实时日志输出）
///
/// 启动 `winget download` 进程，实时通过 Tauri 事件将 stdout/stderr 日志发送到前端。
/// 下载完成后，可选清理生成的 YAML 描述文件。
#[tauri::command]
pub async fn winget_download_stream(
  window: Window,
  id: String,
  source: Option<String>,
  dir: Option<String>,
  flags: Option<Vec<String>>,
  state: State<'_, ExecState>,
  keep_yaml: Option<bool>,
) -> Result<(), String> {
  let mut args_vec: Vec<String> = flags.unwrap_or_default();
  if args_vec.is_empty() {
    args_vec = default_exec_flags_for("download")
      .into_iter()
      .map(|s| s.to_string())
      .collect();
  }
  if source.is_some() {
    args_vec.retain(|x| x != "--source" && x != "winget");
  }

  let mut cmd_args = vec!["download".to_string(), "--id".to_string(), id.clone()];

  cmd_args.extend(args_vec);

  if let Some(s) = source.as_ref() {
    if !s.trim().is_empty() {
      cmd_args.push("--source".to_string());
      cmd_args.push(s.clone());
    }
  }

  let home = std::env::var("USERPROFILE").unwrap_or_else(|_| String::from("."));
  let default_dir = std::path::Path::new(&home)
    .join("Downloads")
    .join("winget-downloads")
    .to_string_lossy()
    .to_string();
  let dir_to_use = dir.filter(|d| !d.trim().is_empty()).unwrap_or(default_dir);

  cmd_args.push("--download-directory".to_string());
  cmd_args.push(dir_to_use.clone());

  let display_cmd = format!("winget {}", cmd_args.join(" "));
  let exec_display_cmd = display_cmd.clone();

  let _ = window.emit(
    "winget-download-start",
    StreamStartPayload {
      id: id.clone(),
      cmd: display_cmd,
    },
  );

  let state_inner = state.inner.clone();
  let keep_yaml = keep_yaml.unwrap_or(false);
  tauri::async_runtime::spawn_blocking(move || {
    let mut cmd = crate::utils::command_hidden("winget");
    cmd.args(&cmd_args);
    match command_spawn_piped_logged(&mut cmd, &exec_display_cmd) {
      Ok(mut child) => {
        let pid = child.id();
        if let Ok(mut m) = state_inner.lock() {
          m.insert(id.clone(), pid);
        }

        if let Some(out) = child.stdout.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(out, move |s| {
            let _ = w.emit(
              "winget-download-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stdout".into(),
                line: s,
              },
            );
          });
        }

        if let Some(err) = child.stderr.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(err, move |s| {
            let _ = w.emit(
              "winget-download-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stderr".into(),
                line: s,
              },
            );
          });
        }

        let status = command_wait_logged(&mut child);
        if let Ok(mut m) = state_inner.lock() {
          m.remove(&id);
        }
        let (success, code) = match status {
          Ok(es) => (es.success(), es.code()),
          Err(_) => (false, None),
        };

        // 下载成功后，如果用户未勾选保留，则清理生成的 YAML 文件
        if success && !keep_yaml {
          if let Ok(entries) = std::fs::read_dir(&dir_to_use) {
            for entry in entries.flatten() {
              let path = entry.path();
              if path.is_file() {
                if let Some(ext) = path.extension() {
                  if ext == "yaml" {
                    // 检查文件名是否包含 id 或与其相关
                    let file_name = path
                      .file_name()
                      .unwrap_or_default()
                      .to_string_lossy()
                      .to_lowercase();
                    if file_name.contains(&id.to_lowercase()) || file_name.contains("manifest") {
                      let _ = std::fs::remove_file(path);
                    }
                  }
                }
              }
            }
          }
        }

        let _ = window.emit(
          "winget-download-finished",
          StreamFinishedPayload { id, success, code },
        );
      }
      Err(e) => {
        let _ = window.emit(
          "winget-download-log",
          StreamLinePayload {
            id: id.clone(),
            stream: "stderr".into(),
            line: format!("启动失败: {}", e),
          },
        );
        let _ = window.emit(
          "winget-download-finished",
          StreamFinishedPayload {
            id,
            success: false,
            code: None,
          },
        );
      }
    }
  });
  Ok(())
}

/// 流式更新软件包（带实时日志输出）
///
/// 启动 `winget upgrade` 进程，实时通过 Tauri 事件将日志发送到前端。
/// 支持交互模式（通过 cmd /C 执行）。
#[tauri::command]
pub async fn winget_upgrade_stream(
  window: Window,
  id: String,
  flags: Option<Vec<String>>,
  state: State<'_, ExecState>,
) -> Result<(), String> {
  let mut flags_vec: Vec<String> = flags.unwrap_or_default();
  if flags_vec.is_empty() {
    flags_vec = default_exec_flags_for("upgrade")
      .into_iter()
      .map(|s| s.to_string())
      .collect();
  }
  let is_interactive = flags_vec.iter().any(|f| f == "--interactive" || f == "-i");

  let mut cmd_args: Vec<String> = vec!["upgrade".to_string(), "--id".to_string(), id.clone()];

  cmd_args.extend(flags_vec);
  let cmdline = format!("chcp 65001>nul & winget {}", cmd_args.join(" "));
  let display_cmd = format!("winget {}", cmd_args.join(" "));
  let exec_display_cmd = if is_interactive {
    format!("cmd /C {}", cmdline)
  } else {
    display_cmd.clone()
  };

  let _ = window.emit(
    "winget-upgrade-start",
    StreamStartPayload {
      id: id.clone(),
      cmd: display_cmd,
    },
  );

  let state_inner = state.inner.clone();
  tauri::async_runtime::spawn_blocking(move || {
    let args_to_use = if is_interactive {
      vec!["/C".to_string(), cmdline]
    } else {
      cmd_args
    };
    let exe = if is_interactive { "cmd" } else { "winget" };
    let mut cmd = crate::utils::command_hidden(exe);
    cmd.args(&args_to_use);
    match command_spawn_piped_logged(&mut cmd, &exec_display_cmd) {
      Ok(mut child) => {
        let pid = child.id();
        if let Ok(mut m) = state_inner.lock() {
          m.insert(id.clone(), pid);
        }

        if let Some(out) = child.stdout.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(out, move |s| {
            let _ = w.emit(
              "winget-upgrade-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stdout".into(),
                line: s,
              },
            );
          });
        }

        if let Some(err) = child.stderr.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(err, move |s| {
            let _ = w.emit(
              "winget-upgrade-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stderr".into(),
                line: s,
              },
            );
          });
        }

        let status = command_wait_logged(&mut child);
        if let Ok(mut m) = state_inner.lock() {
          m.remove(&id);
        }
        let (success, code) = match status {
          Ok(es) => (es.success(), es.code()),
          Err(_) => (false, None),
        };
        let _ = window.emit(
          "winget-upgrade-finished",
          StreamFinishedPayload { id, success, code },
        );
      }
      Err(e) => {
        let _ = window.emit(
          "winget-upgrade-log",
          StreamLinePayload {
            id: id.clone(),
            stream: "stderr".into(),
            line: format!("启动失败: {}", e),
          },
        );
        let _ = window.emit(
          "winget-upgrade-finished",
          StreamFinishedPayload {
            id,
            success: false,
            code: None,
          },
        );
      }
    }
  });
  Ok(())
}

/// 流式安装软件包（带实时日志输出）
///
/// 启动 `winget install` 进程，实时通过 Tauri 事件将日志发送到前端。
/// 支持交互模式（通过 cmd /C 执行）。
#[tauri::command]
pub async fn winget_install_stream(
  window: Window,
  id: String,
  flags: Option<Vec<String>>,
  state: State<'_, ExecState>,
) -> Result<(), String> {
  let mut flags_vec: Vec<String> = flags.unwrap_or_default();
  if flags_vec.is_empty() {
    flags_vec = default_exec_flags_for("install")
      .into_iter()
      .map(|s| s.to_string())
      .collect();
  }
  let is_interactive = flags_vec.iter().any(|f| f == "--interactive" || f == "-i");

  let mut cmd_args: Vec<String> = vec!["install".to_string(), "--id".to_string(), id.clone()];

  cmd_args.extend(flags_vec);
  let cmdline = format!("chcp 65001>nul & winget {}", cmd_args.join(" "));
  let display_cmd = format!("winget {}", cmd_args.join(" "));
  let exec_display_cmd = if is_interactive {
    format!("cmd /C {}", cmdline)
  } else {
    display_cmd.clone()
  };

  let _ = window.emit(
    "winget-install-start",
    StreamStartPayload {
      id: id.clone(),
      cmd: display_cmd,
    },
  );

  let state_inner = state.inner.clone();
  tauri::async_runtime::spawn_blocking(move || {
    let args_to_use = if is_interactive {
      vec!["/C".to_string(), cmdline]
    } else {
      cmd_args
    };
    let exe = if is_interactive { "cmd" } else { "winget" };
    let mut cmd = crate::utils::command_hidden(exe);
    cmd.args(&args_to_use);
    match command_spawn_piped_logged(&mut cmd, &exec_display_cmd) {
      Ok(mut child) => {
        let pid = child.id();
        if let Ok(mut m) = state_inner.lock() {
          m.insert(id.clone(), pid);
        }

        if let Some(out) = child.stdout.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(out, move |s| {
            let _ = w.emit(
              "winget-install-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stdout".into(),
                line: s,
              },
            );
          });
        }

        if let Some(err) = child.stderr.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(err, move |s| {
            let _ = w.emit(
              "winget-install-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stderr".into(),
                line: s,
              },
            );
          });
        }

        let status = command_wait_logged(&mut child);
        if let Ok(mut m) = state_inner.lock() {
          m.remove(&id);
        }
        let (success, code) = match status {
          Ok(es) => (es.success(), es.code()),
          Err(_) => (false, None),
        };
        let _ = window.emit(
          "winget-install-finished",
          StreamFinishedPayload { id, success, code },
        );
      }
      Err(e) => {
        let _ = window.emit(
          "winget-install-log",
          StreamLinePayload {
            id: id.clone(),
            stream: "stderr".into(),
            line: format!("启动失败: {}", e),
          },
        );
        let _ = window.emit(
          "winget-install-finished",
          StreamFinishedPayload {
            id,
            success: false,
            code: None,
          },
        );
      }
    }
  });
  Ok(())
}

/// 流式卸载软件包（带实时日志输出）
///
/// 启动 `winget uninstall` 进程，实时通过 Tauri 事件将日志发送到前端。
/// 支持交互模式（通过 cmd /C 执行）。
#[tauri::command]
pub async fn winget_uninstall_stream(
  window: Window,
  id: String,
  source: Option<String>,
  flags: Option<Vec<String>>,
  state: State<'_, ExecState>,
) -> Result<(), String> {
  let mut args_vec: Vec<String> = flags.unwrap_or_default();
  if args_vec.is_empty() {
    args_vec = default_exec_flags_for("uninstall")
      .into_iter()
      .map(|s| s.to_string())
      .collect();
  }

  // 检查是否包含交互模式
  let is_interactive = args_vec.iter().any(|f| f == "--interactive" || f == "-i");

  let mut cmd_args = vec!["uninstall".to_string(), "--id".to_string(), id.clone()];

  cmd_args.extend(args_vec);

  if let Some(s) = source.as_ref() {
    if !s.trim().is_empty() {
      cmd_args.push("--source".to_string());
      cmd_args.push(s.clone());
    }
  }

  let cmdline = format!("chcp 65001>nul & winget {}", cmd_args.join(" "));
  let display_cmd = format!("winget {}", cmd_args.join(" "));
  let exec_display_cmd = if is_interactive {
    format!("cmd /C {}", cmdline)
  } else {
    display_cmd.clone()
  };

  let _ = window.emit(
    "winget-uninstall-start",
    StreamStartPayload {
      id: id.clone(),
      cmd: display_cmd,
    },
  );

  let state_inner = state.inner.clone();
  tauri::async_runtime::spawn_blocking(move || {
    let args_to_use = if is_interactive {
      vec!["/C".to_string(), cmdline]
    } else {
      cmd_args
    };
    let exe = if is_interactive { "cmd" } else { "winget" };
    let mut cmd = crate::utils::command_hidden(exe);
    cmd.args(&args_to_use);
    match command_spawn_piped_logged(&mut cmd, &exec_display_cmd) {
      Ok(mut child) => {
        let pid = child.id();
        if let Ok(mut m) = state_inner.lock() {
          m.insert(id.clone(), pid);
        }

        if let Some(out) = child.stdout.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(out, move |s| {
            let _ = w.emit(
              "winget-uninstall-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stdout".into(),
                line: s,
              },
            );
          });
        }

        if let Some(err) = child.stderr.take() {
          let w = window.clone();
          let id_clone = id.clone();
          pipe_reader_logged(err, move |s| {
            let _ = w.emit(
              "winget-uninstall-log",
              StreamLinePayload {
                id: id_clone.clone(),
                stream: "stderr".into(),
                line: s,
              },
            );
          });
        }

        let status = command_wait_logged(&mut child);
        if let Ok(mut m) = state_inner.lock() {
          m.remove(&id);
        }
        let (success, code) = match status {
          Ok(es) => (es.success(), es.code()),
          Err(_) => (false, None),
        };
        let _ = window.emit(
          "winget-uninstall-finished",
          StreamFinishedPayload { id, success, code },
        );
      }
      Err(e) => {
        let _ = window.emit(
          "winget-uninstall-log",
          StreamLinePayload {
            id: id.clone(),
            stream: "stderr".into(),
            line: format!("启动失败: {}", e),
          },
        );
        let _ = window.emit(
          "winget-uninstall-finished",
          StreamFinishedPayload {
            id,
            success: false,
            code: None,
          },
        );
      }
    }
  });
  Ok(())
}
