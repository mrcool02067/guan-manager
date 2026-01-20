use std::ffi::OsStr;
use std::io::{Read, Write};
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::process::{Child, Command, Output, Stdio};
use windows::core::PCWSTR;
use windows::Win32::System::Environment::ExpandEnvironmentStringsW;

/// Windows API 常量：创建进程时不显示控制台窗口
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

/// 创建一个默认隐藏窗口的 Command 实例
pub fn command_hidden(exe: &str) -> Command {
  let mut c = Command::new(exe);
  c.creation_flags(CREATE_NO_WINDOW);
  c
}

fn display_command<I, S>(exe: &str, args: I) -> String
where
  I: IntoIterator<Item = S>,
  S: AsRef<str>,
{
  let mut s = String::new();
  s.push_str(exe);
  for a in args {
    s.push(' ');
    s.push_str(a.as_ref());
  }
  s
}

fn build_command_with_display(exe: &str, args: &[&str], hidden: bool) -> (Command, String) {
  let mut cmd = if hidden {
    command_hidden(exe)
  } else {
    Command::new(exe)
  };
  cmd.args(args);
  let display_cmd = display_command(exe, args.iter().copied());
  (cmd, display_cmd)
}

fn build_hidden_command_with_display_strings(exe: &str, args: &[String]) -> (Command, String) {
  let mut cmd = command_hidden(exe);
  cmd.args(args);
  let display_cmd = display_command(exe, args.iter().map(|s| s.as_str()));
  (cmd, display_cmd)
}

fn print_command_started(display_cmd: &str) {
  println!("print_command_started: {}", display_cmd);
}

fn print_command_output(stdout: &[u8], stderr: &[u8]) {
  if !stdout.is_empty() {
    let s = String::from_utf8_lossy(stdout);
    print!("print_command_output stdout: {}", s);
    let _ = std::io::stdout().flush();
  }
  if !stderr.is_empty() {
    let s = String::from_utf8_lossy(stderr);
    print!("print_command_output stderr: {}", s);
    let _ = std::io::stdout().flush();
  }
}

pub fn command_output_logged(cmd: &mut Command, display_cmd: &str) -> Result<Output, String> {
  print_command_started(display_cmd);
  let output = cmd
    .output()
    .map_err(|e| format!("failed to run command: {}", e))?;
  print_command_output(&output.stdout, &output.stderr);
  Ok(output)
}

pub fn command_spawn_piped_logged(cmd: &mut Command, display_cmd: &str) -> Result<Child, String> {
  print_command_started(display_cmd);
  cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
  let child = cmd
    .spawn()
    .map_err(|e| format!("failed to spawn command: {}", e))?;
  Ok(child)
}

pub fn command_wait_logged(child: &mut Child) -> Result<std::process::ExitStatus, String> {
  child
    .wait()
    .map_err(|e| format!("failed to wait command: {}", e))
}

pub fn pipe_reader_logged<R, F>(mut reader: R, mut on_chunk: F)
where
  R: Read + Send + 'static,
  F: FnMut(String) + Send + 'static,
{
  std::thread::spawn(move || {
    let mut buf = [0u8; 4096];
    while let Ok(n) = reader.read(&mut buf) {
      if n == 0 {
        break;
      }
      let raw = String::from_utf8_lossy(&buf[..n]).to_string();
      print!("pipe_reader_logged: {}", raw);
      let _ = std::io::stdout().flush();
      on_chunk(raw);
    }
  });
}

/// 过滤字符串中的 ANSI 转义序列
pub fn strip_ansi(s: &str) -> String {
  let mut res = String::with_capacity(s.len());
  let mut iter = s.chars().peekable();
  while let Some(c) = iter.next() {
    if c == '\x1b' {
      if let Some('[') = iter.peek() {
        iter.next();
        for c2 in iter.by_ref() {
          if (0x40..=0x7E).contains(&(c2 as u8)) {
            break;
          }
        }
        continue;
      }
    }
    res.push(c);
  }
  res
}

pub fn normalize_console_output(s: &str) -> String {
  let s = s.replace("\r\n", "\n");
  let mut lines: Vec<String> = Vec::new();
  let mut current = String::new();

  for ch in s.chars() {
    match ch {
      '\r' => {
        current.clear();
      }
      '\n' => {
        lines.push(std::mem::take(&mut current));
      }
      _ => current.push(ch),
    }
  }
  lines.push(current);
  lines.join("\n")
}

/// 调用 winget 命令行工具
/// 自动处理参数转义和代码页设置 (UTF-8)
pub fn run_winget(args: &[&str]) -> Result<String, String> {
  run_winget_base(args, true)
}

/// 以交互模式调用 winget (显示控制台窗口，适用于卸载等需要交互的操作)
pub fn run_winget_interactive(args: &[&str]) -> Result<String, String> {
  run_winget_base(args, false)
}

/// 以管理员权限运行 winget 命令
pub fn run_winget_admin(args: &[&str]) -> Result<String, String> {
  let args_str = args.join(" ");
  // 使用 PowerShell 的 Start-Process -Verb RunAs 来请求管理员权限
  // -Wait 参数会让 PowerShell 等待 winget 执行完成
  // -WindowStyle Hidden 隐藏窗口
  let powershell_cmd = format!(
    "Start-Process winget -ArgumentList '{}' -Verb RunAs -Wait -WindowStyle Hidden",
    args_str.replace("'", "''")
  );

  let ps_args = ["-NoProfile", "-Command", powershell_cmd.as_str()];
  let (mut cmd, display_cmd) = build_command_with_display("powershell", &ps_args, true);
  let output = command_output_logged(&mut cmd, &display_cmd)?;

  if output.status.success() {
    Ok("已成功以管理员权限执行命令".to_string())
  } else {
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!("管理员权限执行失败: {}", stderr))
  }
}

fn run_winget_base(args: &[&str], hidden: bool) -> Result<String, String> {
  let (mut cmd, display_cmd) = build_command_with_display("winget", args, hidden);

  // 设置较大的列宽，防止 winget 自动截断表格输出
  cmd.env("COLUMNS", "10000");

  let output = command_output_logged(&mut cmd, &display_cmd)?;

  let stdout = String::from_utf8_lossy(&output.stdout).to_string();
  let stderr = String::from_utf8_lossy(&output.stderr).to_string();
  let stripped_stdout = strip_ansi(&stdout);
  let normalized_stdout = normalize_console_output(&stripped_stdout);
  let normalized_stderr = normalize_console_output(&strip_ansi(&stderr));

  // WinGet 特有的退出代码处理
  let code = output.status.code().unwrap_or(-1);
  if !output.status.success() {
    if code == -1978335231 || code as u32 == 0x8A150019 {
      return Ok(normalized_stdout);
    }
    if !normalized_stderr.trim().is_empty() {
      return Err(normalized_stderr);
    }
    if !normalized_stdout.trim().is_empty() {
      return Ok(normalized_stdout);
    }
    return Err(format!("winget exited with code {}", code));
  }
  Ok(normalized_stdout)
}

pub fn run_hidden_output_logged(exe: &str, args: &[String]) -> Result<Output, String> {
  let (mut cmd, display_cmd) = build_hidden_command_with_display_strings(exe, args);
  command_output_logged(&mut cmd, &display_cmd)
}

/// 获取 winget 执行命令的默认标志
/// 例如：--exact, --silent, --force 等
pub fn default_exec_flags_for(subcmd: &str) -> Vec<&'static str> {
  match subcmd {
    "upgrade" | "install" => vec![
      "--exact",
      "--source",
      "winget",
      "--accept-source-agreements",
      "--accept-package-agreements",
      "--disable-interactivity",
      "--silent",
      "--include-unknown",
      "--force",
    ],
    "uninstall" => vec!["--exact", "--accept-source-agreements"],
    "download" => vec![
      "--exact",
      "--source",
      "winget",
      "--accept-source-agreements",
      "--accept-package-agreements",
      "--disable-interactivity",
    ],
    _ => vec![],
  }
}

/// 将 OsStr 转换为 Windows API 使用的宽字符串 (Vec<u16>)
pub fn wstr(s: &OsStr) -> Vec<u16> {
  s.encode_wide().chain(std::iter::once(0)).collect()
}

/// 展开环境变量字符串（如 %APPDATA%）
pub fn expand_env(s: &str) -> String {
  let ws: Vec<u16> = OsStr::new(s)
    .encode_wide()
    .chain(std::iter::once(0))
    .collect();
  let mut buf: Vec<u16> = vec![0; 32767];
  unsafe {
    ExpandEnvironmentStringsW(PCWSTR(ws.as_ptr()), Some(&mut buf));
  }
  let nul = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
  String::from_utf16_lossy(&buf[..nul])
}

/// 将 winget 输出的表格行按列拆分
/// 能够处理 Unicode 字符和不规则空格
pub fn split_columns(line: &str) -> Vec<String> {
  let mut res = Vec::new();
  let chars: Vec<char> = line.chars().collect();
  let mut start = 0;
  let mut in_word = false;

  for i in 0..chars.len() {
    if !chars[i].is_whitespace() {
      if !in_word {
        start = i;
        in_word = true;
      }
    } else {
      // 检查是否是连续的两个以上空格（列分隔符）
      if in_word && (i + 1 >= chars.len() || chars[i + 1].is_whitespace()) {
        let s: String = chars[start..i].iter().collect();
        res.push(s.trim().to_string());
        in_word = false;
      }
    }
  }
  if in_word {
    let s: String = chars[start..].iter().collect();
    res.push(s.trim().to_string());
  }
  res
}

/// 检查字符串是否匹配给定的 Token 列表
/// 采用更严格的匹配逻辑：
/// 1. 优先全字匹配
/// 2. 如果是子串匹配，要求子串长度至少为 2，且目标字符串较长
pub fn match_tokens(s: &str, tokens: &[String]) -> bool {
  let ls = s.to_lowercase().replace(' ', "");
  if ls.is_empty() {
    return false;
  }
  tokens.iter().any(|t| {
    let lt = t.to_lowercase().replace(' ', "");
    if lt.is_empty() {
      return false;
    }
    // 1. 全字匹配 (忽略空格 and 大小写)
    if ls == lt {
      return true;
    }
    // 2. 子串匹配，但要防止过短的匹配
    if lt.len() >= 3 && ls.contains(&lt) {
      return true;
    }
    if ls.len() >= 3 && lt.contains(&ls) {
      return true;
    }
    false
  })
}

/// 计算字符串与 Token 列表的匹配得分
/// 得分越高表示匹配度越高
pub fn match_score(s: &str, tokens: &[String]) -> i32 {
  let ls = s.to_lowercase().replace(' ', "");
  if ls.is_empty() {
    return 0;
  }
  let mut score = 0;
  for t in tokens {
    let lt = t.to_lowercase().replace(' ', "");
    if lt.is_empty() {
      continue;
    }
    // 1. 全字匹配 (得分最高)
    if ls == lt {
      score += 100;
      continue;
    }
    // 2. 包含匹配 (根据 Token 长度加分)
    if lt.len() >= 3 {
      if ls.contains(&lt) {
        score += (lt.len() * 10) as i32;
      } else if lt.contains(&ls) && ls.len() >= 3 {
        score += (ls.len() * 5) as i32;
      }
    }
  }
  score
}

/// 从 ID 和名称中提取搜索用的 Token 列表
pub fn tokens_from(id: &str, name: &str) -> Vec<String> {
  let mut v = Vec::new();

  // 定义要忽略的通用无意义 Token
  let ignore = [
    "exe",
    "msi",
    "setup",
    "install",
    "installer",
    "update",
    "patch",
    "x64",
    "x86",
    "arm64",
    "win64",
    "win32",
    "version",
    "v1",
    "v2",
    "v3",
    "edition",
    "build",
    "release",
    "stable",
    "software",
    "apps",
    "latest",
  ];

  if !name.is_empty() {
    v.push(name.to_string());
    v.push(name.replace(' ', ""));
    // 增加对 "version" 的显式剥离，有些软件名形如 "Name version 1.2"
    let name_lower = name.to_lowercase();
    if let Some(pos) = name_lower.find(" version") {
      v.push(name[..pos].trim().to_string());
    }

    for word in name.split(|c: char| c.is_whitespace() || c == '-' || c == '_') {
      let wl = word.to_lowercase();
      // 过滤太短的词、忽略列表中的词，以及看起来像版本号的词（以数字开头且包含点或横线）
      if word.len() > 2
        && !ignore.contains(&wl.as_str())
        && !wl.chars().next().unwrap_or(' ').is_ascii_digit()
      {
        v.push(word.to_string());
      }
    }
  }
  for p in id.split(['.', '_', '-']) {
    let pl = p.to_lowercase();
    if p.len() > 2
      && !ignore.contains(&pl.as_str())
      && !pl.chars().next().unwrap_or(' ').is_ascii_digit()
    {
      v.push(p.to_string());
    }
  }
  v
}
