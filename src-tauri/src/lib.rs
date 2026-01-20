// 模块声明
pub mod commands;
pub mod icons;
mod menu;
pub mod models;
pub mod state;
pub mod utils;
pub mod winget_utils;

// 导入
use crate::commands::winget::*;
use crate::state::ExecState;
use tauri::{AppHandle, Manager};

/// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_prevent_default::debug())
    .plugin(tauri_plugin_single_instance::init(|app, _, _cwd| {
      show_window(app);
    }))
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    // 状态管理
    .manage(ExecState::default())
    .setup(|app| {
      app.set_menu(menu::init(app)?)?;
      Ok(())
    })
    // 注册命令
    .invoke_handler(tauri::generate_handler![
      winget_list_installed,
      winget_list_upgrades,
      winget_info,
      winget_sources,
      winget_features,
      winget_version,
      winget_help,
      winget_search,
      winget_fast_detail,
      winget_upgrade_stream,
      winget_upgrade_stop,
      winget_install_stream,
      winget_uninstall,
      winget_uninstall_stream,
      winget_stop_task,
      winget_download_stream,
      winget_app_icon_native,
      winget_check_proxy_settings,
      winget_enable_proxy_settings,
      winget_check_installer_hash_override,
      winget_enable_installer_hash_override
    ])
    // 运行应用
    .run(tauri::generate_context!())
    .expect("运行 Tauri 应用程序时发生错误");
}

fn show_window(app: &AppHandle) {
  let windows = app.webview_windows();

  let webview_window = windows.values().next().expect("Sorry, no window found");
  webview_window
    .unminimize()
    .expect("Can't Bring Window to unminimize");
  webview_window.show().expect("Can't Bring Window to show");
  webview_window
    .set_focus()
    .expect("Can't Bring Window to Focus");
}
