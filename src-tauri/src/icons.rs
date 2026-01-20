use std::path::{Path, PathBuf};

use crate::utils::{expand_env, tokens_from, wstr};
use base64::engine::general_purpose::STANDARD as BASE64_STD;
use base64::Engine;
use windows::core::{Interface, PCWSTR};
use windows::Win32::Graphics::Gdi::{
  CreateCompatibleDC, DeleteDC, GetDIBits, GetObjectW, SelectObject, BITMAP, BITMAPINFO,
  BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use windows::Win32::System::Com::{
  CoCreateInstance, CoInitializeEx, IPersistFile, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, STGM,
};
use windows::Win32::UI::Shell::{
  ExtractIconExW, IShellLinkW, SHGetFileInfoW, ShellLink, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON,
};
use windows::Win32::UI::WindowsAndMessaging::{
  DestroyIcon, GetIconInfo, LoadImageW, HICON, ICONINFO, IMAGE_ICON, LR_DEFAULTSIZE,
  LR_LOADFROMFILE,
};
use winreg::enums::*;
use winreg::RegKey;

/// 将 Windows HICON 转换为 PNG 格式的 Base64 字符串
pub fn hicon_to_png_base64(hicon: HICON) -> Option<String> {
  unsafe {
    let mut info = ICONINFO::default();
    if GetIconInfo(hicon, &mut info).is_err() {
      let _ = DestroyIcon(hicon);
      return None;
    }
    let mut bm: BITMAP = std::mem::zeroed();
    let _ = GetObjectW(
      info.hbmColor.into(),
      std::mem::size_of::<BITMAP>() as i32,
      Some(&mut bm as *mut _ as *mut _),
    );
    let w = bm.bmWidth as i32;
    let h = bm.bmHeight as i32;
    if w <= 0 || h <= 0 {
      let _ = DestroyIcon(hicon);
      return None;
    }
    let hdc = CreateCompatibleDC(None);
    let _ = SelectObject(hdc, info.hbmColor.into());
    let bih = BITMAPINFOHEADER {
      biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
      biWidth: w,
      biHeight: h,
      biPlanes: 1,
      biBitCount: 32,
      biCompression: BI_RGB.0,
      biSizeImage: 0,
      biXPelsPerMeter: 0,
      biYPelsPerMeter: 0,
      biClrUsed: 0,
      biClrImportant: 0,
    };
    let mut bi = BITMAPINFO {
      bmiHeader: bih,
      bmiColors: [std::mem::zeroed()],
    };
    let mut buf: Vec<u8> = vec![0; (w * h * 4) as usize];
    let got = GetDIBits(
      hdc,
      info.hbmColor,
      0,
      h as u32,
      Some(buf.as_mut_ptr() as *mut _),
      &mut bi,
      DIB_RGB_COLORS,
    );
    let _ = DeleteDC(hdc);
    let _ = DestroyIcon(hicon);
    if got == 0 {
      return None;
    }
    let mut rgba: Vec<u8> = vec![0; (w * h * 4) as usize];
    let row = (w * 4) as usize;
    for y in 0..h {
      let src_off = ((h - 1 - y) * row as i32) as usize;
      let dst_off = (y * row as i32) as usize;
      for x in 0..w {
        let i = (src_off + (x * 4) as usize) as usize;
        let j = (dst_off + (x * 4) as usize) as usize;
        rgba[j] = buf[i + 2];
        rgba[j + 1] = buf[i + 1];
        rgba[j + 2] = buf[i];
        rgba[j + 3] = buf[i + 3];
      }
    }
    let mut outbuf: Vec<u8> = Vec::new();
    let mut enc = png::Encoder::new(&mut outbuf, w as u32, h as u32);
    enc.set_color(png::ColorType::Rgba);
    enc.set_depth(png::BitDepth::Eight);
    let mut writer = enc.write_header().ok()?;
    writer.write_image_data(&rgba).ok()?;
    drop(writer);
    Some(BASE64_STD.encode(&outbuf))
  }
}

/// 解析 Windows 快捷方式 (.lnk) 的目标路径
pub fn resolve_lnk(path: &Path) -> Option<PathBuf> {
  unsafe {
    let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).ok()?;
    let persist: IPersistFile = link.cast().ok()?;
    let ws = wstr(path.as_os_str());
    persist.Load(PCWSTR(ws.as_ptr()), STGM(0)).ok()?;

    let mut buf = [0u16; 1024];
    link.GetPath(&mut buf, std::ptr::null_mut(), 0).ok()?;
    let nul = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    let target = String::from_utf16_lossy(&buf[..nul]);
    if target.is_empty() {
      return None;
    }
    let pb = PathBuf::from(target);
    if pb.exists() {
      Some(pb)
    } else {
      None
    }
  }
}

/// 从快捷方式 (.lnk) 中提取图标，尽量避开快捷方式箭头叠加层
pub fn icon_from_lnk(path: &Path) -> Option<String> {
  unsafe {
    let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).ok()?;
    let persist: IPersistFile = link.cast().ok()?;
    let ws = wstr(path.as_os_str());
    persist.Load(PCWSTR(ws.as_ptr()), STGM(0)).ok()?;

    // 1. 尝试获取快捷方式指定的自定义图标位置
    let mut icon_path = [0u16; 1024];
    let mut icon_index: i32 = 0;
    if link
      .GetIconLocation(&mut icon_path, &mut icon_index)
      .is_ok()
    {
      let nul = icon_path
        .iter()
        .position(|&c| c == 0)
        .unwrap_or(icon_path.len());
      let icon_path_str = String::from_utf16_lossy(&icon_path[..nul]);
      if !icon_path_str.is_empty() {
        let pb = PathBuf::from(expand_env(&icon_path_str));
        if pb.exists() {
          let ext = pb
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_ascii_lowercase());
          if let Some(e) = ext {
            if e == "exe" || e == "dll" {
              if let Some(b) = icon_from_exe(&pb, icon_index) {
                return Some(b);
              }
            } else if e == "ico" || e == "png" {
              if let Some(b) = icon_from_file(&pb) {
                return Some(b);
              }
            }
          }
        }
      }
    }

    // 2. 如果没有指定图标位置，解析目标路径并从目标文件获取图标
    let mut target_path = [0u16; 1024];
    if link
      .GetPath(&mut target_path, std::ptr::null_mut(), 0)
      .is_ok()
    {
      let nul = target_path
        .iter()
        .position(|&c| c == 0)
        .unwrap_or(target_path.len());
      let target_path_str = String::from_utf16_lossy(&target_path[..nul]);
      if !target_path_str.is_empty() {
        let pb = PathBuf::from(target_path_str);
        if pb.exists() {
          // 对目标文件使用 icon_from_shell，这样就不会有快捷方式箭头了
          return icon_from_shell(&pb);
        }
      }
    }

    // 3. 最后的回退方案：直接对 .lnk 文件使用 shell 提取（这可能会带有箭头）
    icon_from_shell(path)
  }
}

/// 使用 Shell API 获取文件图标
pub fn icon_from_shell(path: &Path) -> Option<String> {
  let ws = wstr(path.as_os_str());
  unsafe {
    let mut shfi = SHFILEINFOW::default();
    let flags = SHGFI_ICON | SHGFI_LARGEICON;
    let res = SHGetFileInfoW(
      PCWSTR(ws.as_ptr()),
      FILE_FLAGS_AND_ATTRIBUTES(0),
      Some(&mut shfi),
      std::mem::size_of::<SHFILEINFOW>() as u32,
      flags,
    );
    if res == 0 || shfi.hIcon.is_invalid() {
      return None;
    }
    hicon_to_png_base64(shfi.hIcon)
  }
}

/// 从图标文件 (.ico, .png) 中加载图标
pub fn icon_from_file(path: &Path) -> Option<String> {
  let ws = wstr(path.as_os_str());
  unsafe {
    let flags =
      windows::Win32::UI::WindowsAndMessaging::IMAGE_FLAGS(LR_LOADFROMFILE.0 | LR_DEFAULTSIZE.0);
    let h = LoadImageW(None, PCWSTR(ws.as_ptr()), IMAGE_ICON, 0, 0, flags).ok()?;
    let hi = HICON(h.0);
    hicon_to_png_base64(hi)
  }
}

/// 从可执行文件 (.exe, .dll) 中提取指定索引的图标
pub fn icon_from_exe(path: &Path, index: i32) -> Option<String> {
  unsafe {
    let mut large: [HICON; 1] = [HICON::default()];
    let mut small: [HICON; 1] = [HICON::default()];
    let ws = wstr(path.as_os_str());
    let ok = ExtractIconExW(
      PCWSTR(ws.as_ptr()),
      index,
      Some(large.as_mut_ptr()),
      Some(small.as_mut_ptr()),
      1,
    );
    if ok != 0 {
      let hi = if !large[0].is_invalid() {
        large[0]
      } else {
        small[0]
      };
      if !hi.is_invalid() {
        return hicon_to_png_base64(hi);
      }
    }
    None
  }
}

/// 在目录中搜索图像文件 (.ico, .png)
pub fn search_images_in_dir(dir: &Path) -> Option<PathBuf> {
  let mut best: Option<(PathBuf, u64)> = None;
  if let Ok(read) = std::fs::read_dir(dir) {
    for entry in read.flatten() {
      let p = entry.path();
      if let Some(ext) = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
      {
        if ext == "ico" || ext == "png" {
          if let Ok(md) = entry.metadata() {
            let len = md.len();
            if best.as_ref().map(|(_, l)| len > *l).unwrap_or(true) {
              best = Some((p, len));
            }
          }
        }
      }
    }
  }
  best.map(|(p, _)| p)
}

/// 在目录中递归搜索匹配 Token 的快捷方式 (.lnk)，返回最佳匹配项
pub fn search_lnk_in_dir(root: &Path, tokens: &[String], max_depth: u8) -> Option<PathBuf> {
  if !root.exists() {
    return None;
  }
  let mut best_match: Option<(PathBuf, i32)> = None;
  let mut stack: Vec<(PathBuf, u8)> = vec![(root.to_path_buf(), 0)];

  while let Some((dir, depth)) = stack.pop() {
    if let Ok(rd) = std::fs::read_dir(&dir) {
      for e in rd.flatten() {
        let p = e.path();
        if p.is_dir() {
          if depth < max_depth {
            stack.push((p, depth + 1));
          }
        } else if let Some(ext) = p
          .extension()
          .and_then(|e| e.to_str())
          .map(|s| s.to_ascii_lowercase())
        {
          if ext == "lnk" {
            let bn = p
              .file_stem()
              .and_then(|s| s.to_str())
              .unwrap_or("")
              .to_lowercase();

            let score = crate::utils::match_score(&bn, tokens);
            if score > 0 && best_match.as_ref().map(|(_, s)| score > *s).unwrap_or(true) {
              best_match = Some((p, score));
            }
          }
        }
      }
    }
  }
  best_match.map(|(p, _)| p)
}

/// 从注册表项中提取图标路径
fn extract_icon_from_regkey(sk: &RegKey) -> Option<(PathBuf, i32)> {
  // 1. 尝试从 DisplayIcon 获取
  if let Ok(di) = sk.get_value::<String, _>("DisplayIcon") {
    let (p, idx) = parse_icon_spec(&di);
    let pb = PathBuf::from(expand_env(&p));
    if pb.exists() {
      return Some((pb, idx));
    }
  }

  // 2. 尝试从 InstallLocation 寻找图像文件或可执行文件
  if let Ok(il) = sk.get_value::<String, _>("InstallLocation") {
    let il_path = PathBuf::from(expand_env(&il));
    if il_path.exists() {
      // 优先搜索核心可执行文件（深度 2，防止搜太深）
      let mut stack = vec![(il_path.clone(), 0)];
      while let Some((curr, depth)) = stack.pop() {
        if let Ok(rd) = std::fs::read_dir(&curr) {
          for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
              if depth < 2 {
                stack.push((p, depth + 1));
              }
            } else if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
              let ext_l = ext.to_lowercase();
              if ext_l == "exe" {
                // 排除一些常见的非主程序名
                let bn = p
                  .file_stem()
                  .and_then(|s| s.to_str())
                  .unwrap_or("")
                  .to_lowercase();
                if !bn.contains("uninstall") && !bn.contains("setup") && !bn.contains("update") {
                  return Some((p, 0));
                }
              }
            }
          }
        }
      }

      // 其次搜索 .ico, .png
      if let Some(img) = search_images_in_dir(&il_path) {
        return Some((img, 0));
      }
    }
  }

  // 3. 尝试从 UninstallString 解析可执行文件路径
  if let Ok(us) = sk.get_value::<String, _>("UninstallString") {
    let us_clean = us.trim().trim_matches('"');
    // 简单的启发式解析：取第一个 .exe 结尾的部分
    if let Some(pos) = us_clean.to_lowercase().find(".exe") {
      let p = &us_clean[..pos + 4];
      let pb = PathBuf::from(expand_env(p));
      if pb.exists() {
        return Some((pb, 0));
      }
    }
  }
  None
}

/// 彻底重构的图标搜索逻辑：采用分层优先级策略
pub fn find_icon_spec(id: &str, name: &str) -> Option<(PathBuf, i32)> {
  let id_lower = id.to_lowercase();
  let name_lower = name.to_lowercase();
  let id_parts: Vec<&str> = id_lower.split('.').collect();
  let id_last_part = id_parts.last().unwrap_or(&"");

  // 1. 定义扫描根目录
  let roots = [
    (
      HKEY_LOCAL_MACHINE,
      "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    ),
    (
      HKEY_LOCAL_MACHINE,
      "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    ),
    (
      HKEY_CURRENT_USER,
      "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    ),
  ];

  // --- 第一层：精确 ID 匹配 ---
  // 直接通过注册表键名（Key Name）定位，这是最准确的
  for (h, sub) in roots {
    let hk = RegKey::predef(h);
    if let Ok(k) = hk.open_subkey(sub) {
      // 尝试完整 ID
      if let Ok(sk) = k.open_subkey(id) {
        if let Some(res) = extract_icon_from_regkey(&sk) {
          return Some(res);
        }
      }
      // 尝试 ID 的最后一部分（如 Google.Chrome -> Chrome）
      if !id_last_part.is_empty() {
        if let Ok(sk) = k.open_subkey(id_last_part) {
          if let Some(res) = extract_icon_from_regkey(&sk) {
            return Some(res);
          }
        }
      }
    }
  }

  // --- 第二层：路径校验匹配 ---
  // 遍历所有已安装程序，但不仅看名字，还要看路径是否包含关键词
  let original_core_name = if name_lower.contains("version") {
    name_lower
      .split("version")
      .next()
      .unwrap_or(&name_lower)
      .trim()
  } else {
    &name_lower
  };
  let core_keywords_no_space = original_core_name.replace(' ', "");

  for (h, sub) in roots {
    let hk = RegKey::predef(h);
    if let Ok(k) = hk.open_subkey(sub) {
      for skn in k.enum_keys().flatten() {
        if let Ok(sk) = k.open_subkey(&skn) {
          let dn: String = sk.get_value("DisplayName").unwrap_or_default();
          if dn.is_empty() {
            continue;
          }
          let dn_lower = dn.to_lowercase();
          let dn_no_space = dn_lower.replace(' ', "");

          // 基础匹配：名字必须包含核心关键词（忽略空格对比）
          if dn_no_space.contains(&core_keywords_no_space)
            || core_keywords_no_space.contains(&dn_no_space)
          {
            // 路径二次校验：如果能拿到图标路径，检查路径里是否也含有核心词
            if let Some(res) = extract_icon_from_regkey(&sk) {
              let path_str_no_space = res.0.to_string_lossy().to_lowercase().replace(' ', "");

              // 1. 如果名字完全一致（忽略空格），直接信任
              if dn_no_space == core_keywords_no_space {
                return Some(res);
              }

              // 2. 如果路径里包含软件的核心词，则认为匹配成功
              // 取 original_core_name 的第一个长单词作为关键校验词，防止路径太长匹配不到全名
              let first_long_word = original_core_name
                .split_whitespace()
                .find(|w| w.len() > 3)
                .unwrap_or(original_core_name);

              if path_str_no_space.contains(&first_long_word.to_lowercase()) {
                return Some(res);
              }
            }
          }
        }
      }
    }
  }

  // --- 第三层：开始菜单快捷方式反查 ---
  // 遍历开始菜单，寻找名字匹配的快捷方式
  let toks = tokens_from(id, name);
  let start_menu_roots = [
    PathBuf::from(expand_env(
      "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs",
    )),
    PathBuf::from(expand_env(
      "%AppData%\\Microsoft\\Windows\\Start Menu\\Programs",
    )),
    PathBuf::from(expand_env("%Public%\\Desktop")),
    PathBuf::from(expand_env("%UserProfile%\\Desktop")),
  ];

  for root in start_menu_roots {
    if let Some(lnk_path) = search_lnk_in_dir(&root, &toks, 3) {
      // 校验快捷方式的文件名是否真的匹配核心词
      let lnk_name = lnk_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();
      let lnk_name_no_space = lnk_name.replace(' ', "");
      if lnk_name_no_space.contains(&core_keywords_no_space)
        || core_keywords_no_space.contains(&lnk_name_no_space)
      {
        // 这里返回 -1 作为一个特殊标记，告诉上层这是个 .lnk 文件
        return Some((lnk_path, -1));
      }
    }
  }

  None
}

fn parse_icon_spec(s: &str) -> (String, i32) {
  let t = s.trim();
  // 情况 1: 带有引号，例如 "C:\Path\App.exe",0 或 "C:\Path\App.exe"
  if let Some(without_first_quote) = t.strip_prefix('"') {
    if let Some(end_quote_pos) = without_first_quote.find('"') {
      let path = &without_first_quote[..end_quote_pos];
      let rest = without_first_quote[end_quote_pos + 1..].trim();
      if let Some(rest_after_comma) = rest.strip_prefix(',') {
        if let Ok(idx) = rest_after_comma.trim().parse::<i32>() {
          return (path.to_string(), idx);
        }
      }
      return (path.to_string(), 0);
    }
  }

  // 情况 2: 带有逗号索引但没引号，例如 C:\Path\App.exe,0
  if let Some(pos) = t.rfind(',') {
    let path_part = t[..pos].trim();
    let idx_part = t[pos + 1..].trim();
    if let Ok(idx) = idx_part.parse::<i32>() {
      // 验证路径部分是否以常见的图标后缀结尾，或者确实存在
      if path_part.to_lowercase().ends_with(".exe")
        || path_part.to_lowercase().ends_with(".dll")
        || path_part.to_lowercase().ends_with(".ico")
      {
        return (path_part.to_string(), idx);
      }
    }
  }

  // 情况 3: 带有命令行参数，例如 C:\Path\App.exe --icon ...
  // 这种常见于 Squirrel 安装的软件（如 Teams, Discord）
  if let Some(exe_pos) = t.to_lowercase().find(".exe") {
    return (t[..exe_pos + 4].to_string(), 0);
  }
  if let Some(ico_pos) = t.to_lowercase().find(".ico") {
    return (t[..ico_pos + 4].to_string(), 0);
  }

  (t.trim_matches('"').to_string(), 0)
}

/// 修改上层调用以支持特殊标记
#[tauri::command]
pub async fn winget_app_icon_native(id: String, name: String) -> Result<String, String> {
  let b64 = tauri::async_runtime::spawn_blocking(move || {
    if let Some((path, index)) = find_icon_spec(&id, &name) {
      // 如果 index 是 -1，说明这是直接找到的快捷方式文件
      if index == -1 {
        return icon_from_lnk(&path);
      }

      let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase());
      if let Some(e) = ext {
        if e == "exe" || e == "dll" {
          return icon_from_exe(&path, index);
        } else if e == "ico" || e == "png" {
          return icon_from_file(&path);
        }
      }

      if path.is_dir() {
        if let Some(img) = search_images_in_dir(&path) {
          return icon_from_file(&img);
        }
      }
    }
    None
  })
  .await
  .map_err(|e| e.to_string())?;

  b64.ok_or_else(|| "未找到图标".to_string())
}
