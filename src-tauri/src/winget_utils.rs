use crate::models::{SearchResult, WingetPackage};
use std::collections::HashSet;

/// 获取字符的视觉显示宽度（等宽字体下）
/// ASCII 占 1 位，非 ASCII（如中文）占 2 位
fn get_visual_width(c: char) -> usize {
  if (c as u32) <= 0x7F {
    1
  } else {
    2
  }
}

/// 1. 解析阶段 (jiexi)：定位分隔线并探测列的视觉起始位置
fn get_col_starts(out: &str) -> Option<(Vec<usize>, Vec<&str>, usize)> {
  let lines: Vec<&str> = out.lines().collect();
  let sep_idx = lines.iter().position(|l| l.contains("---"))?;
  let header = lines[if sep_idx > 0 { sep_idx - 1 } else { 0 }];

  let mut col_starts = Vec::new();
  let mut current_vw = 0;
  let mut in_word = false;

  for c in header.chars() {
    let w = get_visual_width(c);
    if !c.is_whitespace() && !in_word {
      col_starts.push(current_vw);
      in_word = true;
    } else if c.is_whitespace() {
      in_word = false;
    }
    current_vw += w;
  }
  Some((col_starts, lines, sep_idx))
}

/// 2. 提取阶段 (tiqu)：根据列起始位置从行中提取各部分字符串
fn extract_parts(line: &str, col_starts: &[usize]) -> Vec<String> {
  let mut v_pos = 0;
  let char_vws: Vec<(char, usize, usize)> = line
    .chars()
    .map(|c| {
      let w = get_visual_width(c);
      let res = (c, v_pos, v_pos + w);
      v_pos += w;
      res
    })
    .collect();

  col_starts
    .iter()
    .enumerate()
    .map(|(i, &s_vw)| {
      let e_vw = col_starts.get(i + 1).cloned().unwrap_or(9999);
      char_vws
        .iter()
        .filter(|&&(_, cs, ce)| ce > s_vw && cs < e_vw)
        .map(|&(c, _, _)| c)
        .collect::<String>()
        .trim()
        .to_string()
    })
    .collect()
}

/// 检查项是否应该被过滤掉（包含省略号、非 winget 源、或是重复项）
fn is_invalid_or_duplicate(
  fields: &[&str],
  id: &str,
  source: &str,
  seen: &mut HashSet<String>,
) -> bool {
  if fields.iter().any(|f| is_truncated(f)) {
    return true;
  }
  if source != "winget" || id.is_empty() || seen.contains(id) {
    return true;
  }
  seen.insert(id.to_string());
  false
}

/// 基于表头空格块探测的通用解析逻辑：从 winget list 或 upgrade 的文本中提取安装信息
pub fn parse_list(out: &str) -> Vec<WingetPackage> {
  let (col_starts, lines, sep_idx) = match get_col_starts(out) {
    Some(res) => res,
    None => return vec![],
  };

  let mut seen = HashSet::new();
  lines
    .into_iter()
    .skip(sep_idx + 1)
    .filter_map(|line| {
      if line.trim().is_empty() || line.contains("---") {
        return None;
      }

      // 3. 提取并转为结构体
      let parts = extract_parts(line, &col_starts);
      if parts.len() < 5 {
        return None;
      }

      let name = parts[0].clone();
      let id = parts[1].clone();
      let version = parts[2].clone();
      let available = parts[3].clone();
      let source = parts[4].clone();

      // 4. 过滤和去重
      if is_invalid_or_duplicate(
        &[&name, &id, &version, &available, &source],
        &id,
        &source,
        &mut seen,
      ) {
        return None;
      }

      Some(WingetPackage {
        name,
        id,
        version,
        available: if available.is_empty() {
          None
        } else {
          Some(available)
        },
        source: Some(source),
      })
    })
    .collect()
}

/// 通用解析逻辑：从 winget search 的文本中提取搜索结果
pub fn parse_search_text(out: &str) -> Vec<SearchResult> {
  let (col_starts, lines, sep_idx) = match get_col_starts(out) {
    Some(res) => res,
    None => return vec![],
  };

  let mut seen = HashSet::new();
  lines
    .into_iter()
    .skip(sep_idx + 1)
    .filter_map(|line| {
      if line.trim().is_empty() || line.contains("---") {
        return None;
      }

      // 3. 提取并转为结构体
      let parts = extract_parts(line, &col_starts);
      if parts.len() < 4 {
        return None;
      }

      let is_5 = col_starts.len() == 5;
      let name = parts[0].clone();
      let id = parts[1].clone();
      let version = parts[2].clone();
      let r#match = if is_5 { Some(parts[3].clone()) } else { None };
      let source = parts[if is_5 { 4 } else { 3 }].clone();

      // 4. 过滤和去重
      let mut fields = vec![
        name.as_str(),
        id.as_str(),
        version.as_str(),
        source.as_str(),
      ];
      if let Some(ref m) = r#match {
        fields.push(m.as_str());
      }

      if is_invalid_or_duplicate(&fields, &id, &source, &mut seen) {
        return None;
      }

      Some(SearchResult {
        name,
        id,
        version: Some(version),
        r#match,
        source: Some(source),
      })
    })
    .collect()
}

/// 检查字符串是否以省略号结尾，表示被截断
pub fn is_truncated(s: &str) -> bool {
  s.ends_with('…')
}

/// 兼容性解析：从 winget show 文本中尝试提取详情字段
pub fn parse_show_details(out: &str) -> crate::models::ShowDetails {
  use crate::models::ShowDetails;
  let mut d = ShowDetails {
    name: None,
    id: None,
    version: None,
    source: None,
    publisher: None,
    author: None,
    homepage: None,
    license: None,
    description: None,
    moniker: None,
    tags: None,
    manifest: None,
    installer_type: None,
    installer_locale: None,
    download_url: None,
    sha256: None,
    size: None,
    architecture: None,
    installed_version: None,
    available_version: None,
    dependencies: None,
    release_notes: None,
    release_notes_url: None,
    raw_details: Some(out.to_string()),
  };
  let mut current_section: Option<&'static str> = None;

  fn norm_key(k: &str) -> Option<&'static str> {
    match k.to_lowercase().as_str() {
      "name" | "名称" => Some("name"),
      "id" | "软件包 id" | "软件包id" => Some("id"),
      "version" | "版本" => Some("version"),
      "source" | "源" => Some("source"),
      "publisher" | "发布者" => Some("publisher"),
      "author" | "作者" => Some("author"),
      "homepage" | "主页" | "website" | "网站" => Some("homepage"),
      "license" | "许可" => Some("license"),
      "description" | "描述" => Some("description"),
      "moniker" | "别名" | "appmoniker" => Some("moniker"),
      "tags" | "标签" => Some("tags"),
      "manifest" | "清单" => Some("manifest"),
      "installer type" | "安装程序类型" => Some("installer_type"),
      "installer url" | "下载地址" | "安装程序 url" => Some("download_url"),
      "installer sha256" | "安装程序 sha256" | "sha256" => Some("sha256"),
      "installer size" | "下载大小" | "大小" => Some("size"),
      "architecture" | "体系结构" | "架构" => Some("architecture"),
      "installer locale" | "安装程序语言" | "安装程序区域设置" => {
        Some("installer_locale")
      }
      "release notes" | "发布说明" | "发行说明" | "release-notes" | "releasenotes" => {
        Some("release_notes")
      }
      "release notes url" | "发布说明网址" | "发布说明链接" | "发行说明网址" | "发行说明链接"
      | "release-notes url" | "releasenotes url" | "release notes link" | "release-notes link"
      | "releasenotes link" => Some("release_notes_url"),
      "dependencies" | "依赖项" => Some("dependencies"),
      _ => None,
    }
  }

  for line in out.lines() {
    let t = line.trim();
    if t.is_empty() {
      continue;
    }
    if let Some(pos) = t.find(':').or_else(|| t.find('：')) {
      let key = &t[..pos].trim();
      let separator_len = t[pos..].chars().next().map(|c| c.len_utf8()).unwrap_or(1);
      let val = t[pos + separator_len..].trim().to_string();
      if let Some(k) = norm_key(key) {
        current_section = None;
        match k {
          "name" => d.name = Some(val),
          "id" => d.id = Some(val),
          "version" => d.version = Some(val),
          "source" => d.source = Some(val),
          "publisher" => d.publisher = Some(val),
          "author" => d.author = Some(val),
          "homepage" => d.homepage = Some(val),
          "license" => d.license = Some(val),
          "description" => {
            d.description = Some(val);
            current_section = Some("description");
          }
          "moniker" => d.moniker = Some(val),
          "tags" => {
            let parts = val
              .split(|c: char| c == ',' || c == ';' || c.is_whitespace())
              .filter(|s| !s.is_empty())
              .map(|s| s.to_string())
              .collect::<Vec<_>>();
            if !parts.is_empty() {
              d.tags = Some(parts);
            }
          }
          "manifest" => d.manifest = Some(val),
          "installer_type" => d.installer_type = Some(val),
          "download_url" => d.download_url = Some(val),
          "sha256" => d.sha256 = Some(val),
          "size" => d.size = Some(val),
          "architecture" => d.architecture = Some(val),
          "installer_locale" => d.installer_locale = Some(val),
          "release_notes" => {
            d.release_notes = Some(val);
            current_section = Some("release_notes");
          }
          "release_notes_url" => d.release_notes_url = Some(val),
          "dependencies" => {
            let parts = val
              .split(|c: char| c == ',' || c == ';' || c.is_whitespace())
              .filter(|s| !s.is_empty() && *s != "无" && *s != "未指定")
              .map(|s| s.to_string())
              .collect::<Vec<_>>();
            if !parts.is_empty() {
              d.dependencies = Some(parts);
            }
            current_section = Some("dependencies");
          }
          _ => {}
        }
      } else {
        current_section = None;
      }
      continue;
    }
    if let Some(sec) = current_section {
      match sec {
        "description" => {
          let mut s = d.description.take().unwrap_or_default();
          if !s.is_empty() {
            s.push('\n');
          }
          s.push_str(t);
          d.description = Some(s);
        }
        "release_notes" => {
          let mut s = d.release_notes.take().unwrap_or_default();
          if !s.is_empty() {
            s.push('\n');
          }
          s.push_str(t);
          d.release_notes = Some(s);
        }
        "dependencies" => {
          let tok = t.trim_matches(|c: char| c == '-' || c == '*' || c.is_whitespace());
          if !tok.is_empty() {
            let mut list = d.dependencies.take().unwrap_or_default();
            list.push(tok.to_string());
            d.dependencies = Some(list);
          }
        }
        _ => {}
      }
    }
  }
  d
}
