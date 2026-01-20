import { invoke } from '@tauri-apps/api/core';
import type { FeatureEntry, SourceEntry } from '../../types/winget';

/**
 * 获取源列表
 */
export function getSources(): Promise<SourceEntry[]> {
  return invoke<SourceEntry[]>('winget_sources');
}

/**
 * 获取 winget --info 文本
 */
export function getInfo(): Promise<string> {
  return invoke<string>('winget_info');
}

/**
 * 获取 winget 版本字符串
 */
export function getWingetVersion(): Promise<string> {
  return invoke<string>('winget_version');
}

/**
 * 检查 winget 是否已安装
 * 增加重试机制以提高检测的严谨性
 */
export async function checkWingetInstalled(): Promise<boolean> {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const v = await getWingetVersion();
      if (v && v.trim().length > 0) {
        return true;
      }
    } catch (e) {
      console.error(`WinGet check attempt ${i + 1} failed:`, e);
    }
    // 如果不是最后一次尝试，则等待一段时间再重试
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

/**
 * 获取实验功能（winget features）
 */
export function getFeatures(): Promise<FeatureEntry[]> {
  return invoke<FeatureEntry[]>('winget_features');
}

/**
 * 获取 winget --help 文本
 */
export function getHelpText(): Promise<string> {
  return invoke<string>('winget_help');
}

/**
 * 停止任务
 */
export function stopTask(id: string): Promise<void> {
  return invoke<void>('winget_stop_task', { id });
}

/**
 * 检查代理设置
 */
export function checkProxySettings(): Promise<boolean> {
  return invoke<boolean>('winget_check_proxy_settings');
}

/**
 * 启用代理设置
 */
export function enableProxySettings(): Promise<string> {
  return invoke<string>('winget_enable_proxy_settings');
}

/**
 * 检查是否已启用安装程序哈希覆盖 (InstallerHashOverride)
 */
export function checkInstallerHashOverride(): Promise<boolean> {
  return invoke<boolean>('winget_check_installer_hash_override');
}

/**
 * 启用安装程序哈希覆盖 (InstallerHashOverride)
 * 通常需要管理员权限
 */
export function enableInstallerHashOverride(): Promise<string> {
  return invoke<string>('winget_enable_installer_hash_override');
}
