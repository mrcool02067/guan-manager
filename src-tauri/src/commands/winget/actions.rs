use crate::state::ExecState;
use crate::utils::{
  default_exec_flags_for, run_hidden_output_logged, run_winget, run_winget_admin,
  run_winget_interactive,
};
use tauri::State;

/// 卸载软件包（一次性操作）
///
/// 执行 `winget uninstall` 命令。支持指定标志和是否交互模式。
#[tauri::command]
pub async fn winget_uninstall(
  id: String,
  flags: Option<Vec<String>>,
  _source: Option<String>,
) -> Result<String, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let mut args = vec!["uninstall", "--id", &id];
    let flags_vec = flags.unwrap_or_default();
    let is_interactive = flags_vec.iter().any(|f| f == "--interactive" || f == "-i");

    // 添加额外标志
    let mut flags_to_use = Vec::new();
    for f in flags_vec.iter() {
      flags_to_use.push(f.as_str());
    }
    if flags_to_use.is_empty() {
      for f in default_exec_flags_for("uninstall") {
        flags_to_use.push(f);
      }
    }
    args.extend(flags_to_use);

    if is_interactive {
      run_winget_interactive(&args)
    } else {
      run_winget(&args)
    }
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 停止正在进行的任务
///
/// 根据任务 ID (软件包 ID) 查找对应的进程 PID 并强制结束进程树。
#[tauri::command]
pub async fn winget_stop_task(id: String, state: State<'_, ExecState>) -> Result<(), String> {
  let inner = state.inner.clone();
  tauri::async_runtime::spawn_blocking(move || {
    let pid = inner
      .lock()
      .map_err(|_| "获取锁失败".to_string())?
      .remove(&id);
    if let Some(p) = pid {
      let args = vec![
        "/PID".to_string(),
        p.to_string(),
        "/T".to_string(),
        "/F".to_string(),
      ];
      let _ = run_hidden_output_logged("taskkill", &args);
      Ok(())
    } else {
      Err("未找到正在运行的任务".to_string())
    }
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 停止正在进行的更新任务
///
/// 内部调用 `winget_stop_task`。保留此方法名以兼容旧的前端调用。
#[tauri::command]
pub async fn winget_upgrade_stop(id: String, state: State<'_, ExecState>) -> Result<(), String> {
  winget_stop_task(id, state).await
}

/// 启用代理命令行选项
///
/// 执行 `winget settings --enable ProxyCommandLineOptions` 命令。
/// 此操作通常需要管理员权限。
#[tauri::command]
pub async fn winget_enable_proxy_settings() -> Result<String, String> {
  tauri::async_runtime::spawn_blocking(|| {
    run_winget_admin(&["settings", "--enable", "ProxyCommandLineOptions"])
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 启用安装程序哈希覆盖
///
/// 执行 `winget settings --enable InstallerHashOverride` 命令。
/// 此操作通常需要管理员权限。
#[tauri::command]
pub async fn winget_enable_installer_hash_override() -> Result<String, String> {
  tauri::async_runtime::spawn_blocking(|| {
    run_winget_admin(&["settings", "--enable", "InstallerHashOverride"])
  })
  .await
  .map_err(|e| e.to_string())?
}
