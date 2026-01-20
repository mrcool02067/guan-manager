// 执行类命令的默认参数（前端作为源头统一提供）
export const DEFAULT_EXEC_FLAGS: string[] = [
  '--exact',
  '--source',
  'winget',
  '--accept-source-agreements',
  '--disable-interactivity',
  '--silent',
  '--include-unknown',
  '--accept-package-agreements',
  '--force',
];

// 卸载专用默认参数 (移除 --silent 和 --disable-interactivity 以显示官方卸载界面)
export const DEFAULT_UNINSTALL_FLAGS: string[] = [
  '--exact',
  '--accept-source-agreements',
];

// 下载专用默认参数 (移除不兼容的 --silent 和 --include-unknown)
export const DEFAULT_DOWNLOAD_FLAGS: string[] = [
  '--exact',
  '--accept-source-agreements',
  '--accept-package-agreements',
];
