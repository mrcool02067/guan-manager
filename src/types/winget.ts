/**
 * 软件条目
 */
export type WingetPackage = {
  /** 软件名称 */
  name: string;
  /** 包唯一标识 */
  id: string;
  /** 当前安装的版本 */
  version?: string | null;
  /** 可更新版本（可能为空） */
  available?: string | null;
  /** 匹配项（搜索时可能存在） */
  match?: string | null;
  /** 来源（可能为空） */
  source?: string | null;
};

/**
 * 获取 WingetPackage 的唯一 Key，用于表格 rowKey 和选择逻辑
 */
export function getPackageRowKey(p: WingetPackage): string {
  return p.id;
}

/**
 * 源条目
 * 说明：对应 `winget source list` 的结果，用于“来源”页展示
 */
export type SourceEntry = {
  /** 名称 */
  name: string;
  /** 源地址或参数 */
  arg: string;
  /** 是否显式添加 */
  explicit: string;
};

/**
 * winget 实验功能条目
 */
export type FeatureEntry = {
  /** 功能名 */
  feature: string;
  /** 当前状态 */
  status: string;
  /** 额外属性（可能为空） */
  property?: string | null;
  /** 文档链接（可能为空） */
  link?: string | null;
};

/**
 * 详情字段集合
 * 说明：后端（Tauri）解析的包详情结构
 */
export type ShowDetail = {
  id?: string | null;
  name?: string | null;
  version?: string | null;
  source?: string | null;
  publisher?: string | null;
  author?: string | null;
  homepage?: string | null;
  license?: string | null;
  description?: string | null;
  moniker?: string | null;
  tags?: string[] | null;
  manifest?: string | null;
  installer_type?: string | null;
  installer_locale?: string | null;
  download_url?: string | null;
  sha256?: string | null;
  size?: string | null;
  architecture?: string | null;
  installed_version?: string | null;
  available_version?: string | null;
  dependencies?: string[] | null;
  release_notes?: string | null;
  release_notes_url?: string | null;
  raw_details?: string | null;
};

/**
 * 原始 KV 明细
 * 说明：从 `raw_details` 文本中提取的键值集合
 */
export type RawKV = {
  id?: string;
  version?: string;
  source?: string;
  publisher?: string;
  author?: string;
  homepage?: string;
  manifest?: string;
  license?: string;
  license_url?: string;
  privacy_url?: string;
  moniker?: string;
  installer_type?: string;
  installer_url?: string;
  installer_locale?: string;
  architecture?: string;
  size?: string;
  download_url?: string;
  sha256?: string;
  tags?: string[];
  dependencies?: string[];
  release_notes_url?: string;
  server_url?: string;
  server_support_url?: string;
  purchase_url?: string;
  copyright?: string;
  copyright_url?: string;
  description?: string;
  release_date?: string;
  offline?: boolean | null;
  release_notes_intro?: string;
  release_sections?: { title: string; items: string[] }[];
  docs?: { title: string; url: string }[];
};

/**
 * 详情视图
 * 说明：融合 `ShowDetail` 与 `RawKV` 后用于页面展示的结构
 */
export type DetailView = {
  id?: string | null;
  name?: string | null;
  version?: string | null;
  installed_version?: string | null;
  available_version?: string | null;
  source?: string | null;
  publisher?: string | null;
  author?: string | null;
  homepage?: string | null;
  manifest?: string | null;
  license?: string | null;
  license_url?: string | null;
  privacy_url?: string | null;
  copyright?: string | null;
  copyright_url?: string | null;
  moniker?: string | null;
  tags?: string[] | null;
  dependencies?: string[] | null;
  installer_type?: string | null;
  installer_locale?: string | null;
  architecture?: string | null;
  size?: string | null;
  download_url?: string | null;
  installer_url?: string | null;
  sha256?: string | null;
  release_notes?: string | null;
  release_notes_url?: string | null;
  release_notes_intro?: string | null;
  release_sections?: { title: string; items: string[] }[] | null;
  docs?: { title: string; url: string }[] | null;
  description?: string | null;
  server_url?: string | null;
  server_support_url?: string | null;
  purchase_url?: string | null;
  release_date?: string | null;
  offline?: boolean | null;
};

/**
 * Winget 日志输出事件负载
 */
export interface WingetLogPayload {
  id: string;
  line: string;
}

/**
 * Winget 进程结束事件负载
 */
export interface WingetFinishedPayload {
  id: string;
  success: boolean;
}
