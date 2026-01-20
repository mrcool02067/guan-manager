import { invoke } from '@tauri-apps/api/core';
import type { ShowDetail, WingetPackage } from '../../types/winget';
import {
  DEFAULT_DOWNLOAD_FLAGS,
  DEFAULT_EXEC_FLAGS,
  DEFAULT_UNINSTALL_FLAGS,
} from './constants';

/**
 * 列出已安装列表
 */
export function listInstalled(): Promise<WingetPackage[]> {
  return invoke<WingetPackage[]>('winget_list_installed');
}

/**
 * 列出可更新的软件列表
 */
export function listUpgrades(proxy?: string): Promise<WingetPackage[]> {
  return invoke<WingetPackage[]>('winget_list_upgrades', { proxy });
}

/**
 * 通过 PowerShell 查询包
 */
export function searchWinget(
  query: string,
  proxy?: string,
): Promise<WingetPackage[]> {
  return invoke<WingetPackage[]>('winget_search', { query, proxy });
}

/**
 * 获取“快速详情”
 */
export function wingetFastDetail(
  id: string,
  proxy?: string,
): Promise<ShowDetail> {
  return invoke<ShowDetail>('winget_fast_detail', { id, proxy });
}

/**
 * 更新包（流式）
 */
export function upgradeStream(
  id: string,
  flags: string[] = DEFAULT_EXEC_FLAGS,
): Promise<void> {
  return invoke<void>('winget_upgrade_stream', { id, flags });
}

/**
 * 安装包（流式）
 */
export function installStream(
  id: string,
  flags: string[] = DEFAULT_EXEC_FLAGS,
): Promise<void> {
  return invoke<void>('winget_install_stream', { id, flags });
}

/**
 * 通过 ID 卸载包
 */
export function uninstallById(
  id: string,
  flags: string[] = DEFAULT_UNINSTALL_FLAGS,
  source?: string | null,
): Promise<string> {
  return invoke<string>('winget_uninstall', {
    id,
    flags,
    source: source ?? null,
  });
}

/**
 * 卸载包（流式）
 */
export function uninstallStream(
  id: string,
  source?: string | null,
  flags: string[] = DEFAULT_UNINSTALL_FLAGS,
): Promise<void> {
  return invoke<void>('winget_uninstall_stream', {
    id,
    source: source ?? null,
    flags,
  });
}

/**
 * 下载安装程序（流式）
 */
export function downloadStream(
  id: string,
  source?: string | null,
  dir?: string,
  flags: string[] = DEFAULT_DOWNLOAD_FLAGS,
  keepYaml = false,
): Promise<void> {
  return invoke<void>('winget_download_stream', {
    id,
    source,
    dir,
    flags,
    keepYaml,
  });
}

/**
 * 停止更新
 */
export function stopUpgrade(id: string): Promise<void> {
  return invoke<void>('winget_upgrade_stop', { id });
}

/**
 * 获取应用图标
 */
export function getAppIcon(id: string, name?: string | null): Promise<string> {
  return invoke<string>('winget_app_icon_native', { id, name }).then(
    (base64) => {
      if (!base64) throw new Error('empty-icon');
      return `data:image/png;base64,${base64}`;
    },
  );
}
