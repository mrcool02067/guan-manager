import { appDataDir, resourceDir } from '@tauri-apps/api/path';
import { Window } from '@tauri-apps/api/window';
import { initEnv } from './constants/env.ts';
import { checkWingetInstalled } from './services/winget/system';

export let appDataDirPath: string;
export let resourceDirPath: string;
export let isWingetInstalled: boolean = false;

export const appWindow = new Window('main');

export async function initAll() {
  await initEnv();
  await initDir();
  // 强制检测 WinGet 是否安装
  isWingetInstalled = await checkWingetInstalled();
}

/**
 * 初始化文件夹
 * 必须要先有文件夹，才能创建文件
 */
export async function initDir(): Promise<void> {
  appDataDirPath = await appDataDir();
  try {
    resourceDirPath = await resourceDir();
  } catch {
    resourceDirPath = '';
  }
}
