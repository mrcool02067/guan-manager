use serde::{Deserialize, Serialize};

/// 软件条目
/// 包含软件的基本信息，如名称、包 ID、版本等
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WingetPackage {
  /// 软件名称
  pub name: String,
  /// 唯一的包 ID (例如 "Microsoft.Edge")
  pub id: String,
  /// 当前安装的版本
  pub version: String,
  /// 可用的更新版本（如果有）
  pub available: Option<String>,
  /// 安装来源 (例如 "winget")
  pub source: Option<String>,
}

/// 源（仓库）条目
/// 描述 Winget 的软件源信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceEntry {
  /// 名称 (例如 "winget")
  pub name: String,
  /// 源的参数或 URL
  pub arg: String,
  /// 是否显式添加
  pub explicit: String,
}

/// 实验性功能条目
/// 描述 Winget 启用的实验性功能状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureEntry {
  /// 功能名称
  pub feature: String,
  /// 状态（例如 "enabled", "disabled"）
  pub status: String,
  /// 额外属性
  pub property: Option<String>,
  /// 相关文档链接
  pub link: Option<String>,
}

/// 搜索结果条目
/// 描述在软件源中搜索到的软件包
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
  /// 软件名称
  pub name: String,
  /// 唯一的包 ID
  pub id: String,
  /// 最新可用版本
  pub version: Option<String>,
  /// 匹配到的关键字
  pub r#match: Option<String>,
  /// 来源
  pub source: Option<String>,
}

/// 软件详情
/// 包含软件包的所有元数据，用于“查看详情”页面
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShowDetails {
  pub name: Option<String>,
  pub id: Option<String>,
  pub version: Option<String>,
  pub source: Option<String>,
  pub publisher: Option<String>,
  pub author: Option<String>,
  pub homepage: Option<String>,
  pub license: Option<String>,
  pub description: Option<String>,
  pub moniker: Option<String>,
  pub tags: Option<Vec<String>>,
  pub manifest: Option<String>,
  pub installer_type: Option<String>,
  pub installer_locale: Option<String>,
  pub download_url: Option<String>,
  pub sha256: Option<String>,
  pub size: Option<String>,
  pub architecture: Option<String>,
  pub installed_version: Option<String>,
  pub available_version: Option<String>,
  pub dependencies: Option<Vec<String>>,
  pub release_notes: Option<String>,
  pub release_notes_url: Option<String>,
  pub raw_details: Option<String>,
}

/// 流式输出开始载荷
#[derive(Debug, Clone, Serialize)]
pub struct StreamStartPayload {
  pub id: String,
  pub cmd: String,
}

/// 流式输出行载荷
#[derive(Debug, Clone, Serialize)]
pub struct StreamLinePayload {
  pub id: String,
  pub stream: String,
  pub line: String,
}

/// 流式输出完成载荷
#[derive(Debug, Clone, Serialize)]
pub struct StreamFinishedPayload {
  pub id: String,
  pub success: bool,
  pub code: Option<i32>,
}
