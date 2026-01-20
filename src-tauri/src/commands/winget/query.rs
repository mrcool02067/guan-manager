use crate::models::*;
use crate::utils::run_winget;
use crate::winget_utils::*;

/// 获取已安装软件包列表
///
/// 调用 `winget list` 命令并解析输出，返回已安装软件包的数组。
#[tauri::command]
pub async fn winget_list_installed() -> Result<Vec<WingetPackage>, String> {
  let items = tauri::async_runtime::spawn_blocking(move || {
    let args = vec!["list", "--accept-source-agreements"];
    let out = run_winget(&args)?.replace('\r', "");
    Ok::<Vec<WingetPackage>, String>(parse_list(&out))
  })
  .await
  .map_err(|e| e.to_string())??;

  Ok(items)
}

/// 获取可更新软件包列表
///
/// 调用 `winget upgrade` 命令并解析输出，返回可更新软件包的数组。
/// 支持通过 `proxy` 参数设置代理。
#[tauri::command]
pub async fn winget_list_upgrades(proxy: Option<String>) -> Result<Vec<WingetPackage>, String> {
  let items =
    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<WingetPackage>, String> {
      let mut args = vec!["upgrade", "--accept-source-agreements"];
      if let Some(p) = &proxy {
        args.push("--proxy");
        args.push(p);
      }
      let out = run_winget(&args)?.replace('\r', "");
      let items = parse_list(&out);
      Ok(items)
    })
    .await
    .map_err(|e| e.to_string())??;

  Ok(items)
}

/// 获取 WinGet 详细信息
///
/// 执行 `winget --info` 命令，返回包含版本、系统信息和路径的原始字符串。
#[tauri::command]
pub async fn winget_info() -> Result<String, String> {
  let args = vec!["--info"];
  run_winget(&args)
}

/// 获取 WinGet 软件源列表
///
/// 执行 `winget source list` 命令并解析输出，返回已配置软件源的数组。
#[tauri::command]
pub async fn winget_sources() -> Result<Vec<SourceEntry>, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let args = vec!["source", "list"];
    let out = run_winget(&args)?.replace('\r', "");
    let mut items = Vec::new();
    let mut dashes_passed = false;

    for line in out.lines() {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }

      // 分隔线标志着数据的开始
      if !dashes_passed && line.contains("---") {
        dashes_passed = true;
        continue;
      }

      if dashes_passed {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() == 3 {
          items.push(SourceEntry {
            name: parts[0].to_string(),
            arg: parts[1].to_string(),
            explicit: parts[2].to_string(),
          });
        }
      }
    }
    Ok(items)
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 获取 WinGet 实验性功能列表
///
/// 执行 `winget features` 命令并解析输出，返回实验性功能的启用状态。
#[tauri::command]
pub async fn winget_features() -> Result<Vec<FeatureEntry>, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let args = vec!["features"];
    let out = run_winget(&args)?.replace('\r', "");
    let mut items = Vec::new();
    let mut dashes_passed = false;

    for line in out.lines() {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }

      if !dashes_passed && line.contains("---") {
        dashes_passed = true;
        continue;
      }

      if dashes_passed {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
          // 最后一项通常是属性/链接（如果有的话）
          // 倒数第二项通常是状态
          // 前面的所有项组成功能名称
          let (feature, status, property) = if parts.len() >= 3 {
            let property = Some(parts[parts.len() - 1].to_string());
            let status = parts[parts.len() - 2].to_string();
            let feature = parts[..parts.len() - 2].join(" ");
            (feature, status, property)
          } else {
            let status = parts[parts.len() - 1].to_string();
            let feature = parts[..parts.len() - 1].join(" ");
            (feature, status, None)
          };

          items.push(FeatureEntry {
            feature,
            status,
            property,
            link: None,
          });
        }
      }
    }
    Ok(items)
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 获取 WinGet 版本号
///
/// 执行 `winget --version` 命令。
#[tauri::command]
pub async fn winget_version() -> Result<String, String> {
  let args = vec!["--version"];
  run_winget(&args)
}

/// 获取 WinGet 帮助文本
///
/// 执行 `winget --help` 命令。
#[tauri::command]
pub async fn winget_help() -> Result<String, String> {
  let args = vec!["--help"];
  run_winget(&args)
}

/// 搜索软件包
///
/// 执行 `winget search` 命令并解析输出，返回搜索结果数组。
/// 如果查询关键字为空，直接返回空数组。
#[tauri::command]
pub async fn winget_search(
  query: String,
  proxy: Option<String>,
) -> Result<Vec<SearchResult>, String> {
  if query.trim().is_empty() {
    return Ok(vec![]);
  }
  let items = tauri::async_runtime::spawn_blocking(move || {
    let mut args = vec!["search", &query, "--accept-source-agreements"];
    if let Some(p) = &proxy {
      args.push("--proxy");
      args.push(p);
    }
    let out = run_winget(&args)?.replace('\r', "");
    Ok::<Vec<SearchResult>, String>(parse_search_text(&out))
  })
  .await
  .map_err(|e| e.to_string())??;

  Ok(items)
}

/// 显示软件包详情
///
/// 执行 `winget show` 命令并解析输出，返回软件包的详细信息（描述、作者、链接等）。
pub async fn winget_show_detail(id: String, proxy: Option<String>) -> Result<ShowDetails, String> {
  let id_clone = id.clone();
  tauri::async_runtime::spawn_blocking(move || {
    let mut args = vec!["show"];
    if is_truncated(&id_clone) {
      args.push("--id");
      args.push(
        id_clone
          .trim_end_matches('…')
          .trim_end_matches("...")
          .trim(),
      );
    } else {
      args.push("--id");
      args.push(&id_clone);
      args.push("--exact");
    }
    args.push("--accept-source-agreements");

    if let Some(p) = &proxy {
      args.push("--proxy");
      args.push(p);
    }

    let out = run_winget(&args)?.replace('\r', "");
    let mut details = parse_show_details(&out);
    details.raw_details = Some(out);
    Ok(details)
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 快速获取详情
///
/// 内部调用 `winget_show_detail`。通常用于列表展开或悬停提示等场景。
#[tauri::command]
pub async fn winget_fast_detail(id: String, proxy: Option<String>) -> Result<ShowDetails, String> {
  winget_show_detail(id, proxy).await
}

/// 检查代理命令行选项设置
///
/// 导出 WinGet 设置并检查 `ProxyCommandLineOptions` 是否已启用。
#[tauri::command]
pub async fn winget_check_proxy_settings() -> Result<bool, String> {
  tauri::async_runtime::spawn_blocking(|| {
    let out = run_winget(&["settings", "export"])?;
    // 解析 JSON 格式的设置
    if let Some(start) = out.find('{') {
      if let Some(end) = out.rfind('}') {
        let json_str = &out[start..=end];
        // 简单解析 JSON，查找 ProxyCommandLineOptions 的值
        if let Some(pos) = json_str.find("\"ProxyCommandLineOptions\"") {
          let rest = &json_str[pos..];
          if let Some(colon_pos) = rest.find(':') {
            let value_part = &rest[colon_pos + 1..];
            let trimmed = value_part.trim();
            // 检查是否为 true（忽略周围的空白和引号）
            return Ok(trimmed.starts_with("true") && !trimmed.starts_with("false"));
          }
        }
      }
    }
    Ok(false)
  })
  .await
  .map_err(|e| e.to_string())?
}

/// 检查安装程序哈希覆盖设置
///
/// 导出 WinGet 设置并检查 `InstallerHashOverride` 是否已启用。
#[tauri::command]
pub async fn winget_check_installer_hash_override() -> Result<bool, String> {
  tauri::async_runtime::spawn_blocking(|| {
    let out = run_winget(&["settings", "export"])?;
    // 解析 JSON 格式的设置
    if let Some(start) = out.find('{') {
      if let Some(end) = out.rfind('}') {
        let json_str = &out[start..=end];
        // 简单解析 JSON，查找 InstallerHashOverride 的值
        if let Some(pos) = json_str.find("\"InstallerHashOverride\"") {
          let rest = &json_str[pos..];
          if let Some(colon_pos) = rest.find(':') {
            let value_part = &rest[colon_pos + 1..];
            let trimmed = value_part.trim();
            // 检查是否为 true
            return Ok(trimmed.starts_with("true") && !trimmed.starts_with("false"));
          }
        }
      }
    }
    Ok(false)
  })
  .await
  .map_err(|e| e.to_string())?
}
