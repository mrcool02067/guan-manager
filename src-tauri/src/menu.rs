use tauri::menu::MenuEvent;
use tauri::menu::{Menu, MenuBuilder, SubmenuBuilder};
use tauri::AppHandle;
use tauri::Emitter;
use tauri::{App, Wry};

/// 初始化应用菜单（含子菜单与菜单项），并在创建后自动注册菜单事件。
/// 返回构建好的 `Menu<Wry>`；事件注册由内部调用 `register_events` 完成。
#[cfg(target_os = "windows")]
pub fn init(app: &App) -> tauri::Result<Menu<Wry>> {
  use tauri::menu::CheckMenuItemBuilder;

  let settings = CheckMenuItemBuilder::with_id("settings", "设置").build(app)?;

  // 构建“帮助”子菜单
  let about = SubmenuBuilder::new(app, "帮助")
    .text("tutorial", "问题&&教程")
    .text("about", "关于")
    .build()?;

  // 组装顶级菜单
  let menu = MenuBuilder::new(app).items(&[&settings, &about]).build()?;

  // 自动注册菜单事件：根据菜单项ID向前端派发对应事件
  register_events(app);

  Ok(menu)
}

/// 注册菜单事件：根据菜单项 ID 派发到前端事件总线。
/// 此方法由 `init` 在菜单创建完成后调用，实现自动注册，无需在 `main.rs` 手动调用。
pub fn register_events(app: &App) {
  app.on_menu_event(
    |app_handle: &AppHandle, event: MenuEvent| match event.id().0.as_str() {
      "tauri://about" => {
        let _ = app_handle.emit("about_emit", ());
      }
      "tauri://preferences" => {
        let _ = app_handle.emit("settings_emit", ());
      }
      "settings" => {
        let _ = app_handle.emit("settings_emit", ());
      }
      "getPro" => {
        let _ = app_handle.emit("getPro_emit", ());
      }
      "tutorial" => {
        let _ = app_handle.emit("tutorial_emit", ());
      }
      "activate" => {
        let _ = app_handle.emit("activate_emit", ());
      }
      "about" => {
        let _ = app_handle.emit("about_emit", ());
      }

      "import_single" => {
        let _ = app_handle.emit("import_single_emit", ());
      }
      "export_single" => {
        let _ = app_handle.emit("export_single_emit", ());
      }
      "import_all" => {
        let _ = app_handle.emit("import_all_emit", ());
      }
      "export_all" => {
        let _ = app_handle.emit("export_all_emit", ());
      }
      _ => {}
    },
  );
}
