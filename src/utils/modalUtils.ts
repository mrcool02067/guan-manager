import React from 'react';
import {
  checkInstallerHashOverride,
  checkProxySettings,
  enableInstallerHashOverride,
  enableProxySettings,
} from '../services/winget/system';

/**
 * 向日志容器追加文本
 * @param logBoxRef 日志容器的引用
 * @param text 要追加的文本
 */
export function appendLog(
  logBoxRef: React.RefObject<HTMLDivElement | null>,
  text: string,
) {
  const logBox = logBoxRef.current;
  if (logBox) {
    const prev = logBox.textContent || '';
    const pendingEsc = logBox.dataset.pendingEsc || '';
    const next = applyTerminalChunk(prev, text, {
      pendingEsc,
    });
    logBox.textContent = next.text;
    if (next.pendingEsc) logBox.dataset.pendingEsc = next.pendingEsc;
    else delete logBox.dataset.pendingEsc;
  }
}

/**
 * 追加日志并自动滚动到底部
 */
export function appendLogAndScroll(
  logBoxRef: React.RefObject<HTMLDivElement | null>,
  logScrollRef: React.RefObject<HTMLDivElement | null>,
  text: string,
) {
  appendLog(logBoxRef, text);
  if (logScrollRef.current) {
    logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }
}

/**
 * 清空日志
 */
export function clearLog(logBoxRef: React.RefObject<HTMLDivElement | null>) {
  if (logBoxRef.current) {
    logBoxRef.current.textContent = '';
    delete logBoxRef.current.dataset.pendingEsc;
  }
}

type TerminalChunkState = {
  pendingEsc: string;
};

function applyTerminalChunk(
  prev: string,
  chunk: string,
  state: TerminalChunkState,
): { text: string; pendingEsc: string } {
  const parts = prev.split('\n');
  let currentLine = parts.pop() ?? '';
  const lines = parts;

  let pendingEsc = state.pendingEsc || '';
  const input = pendingEsc + chunk;
  pendingEsc = '';

  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === '\u001b') {
      const next = input[i + 1];
      if (typeof next === 'undefined') {
        pendingEsc = '\u001b';
        break;
      }

      if (next === '[') {
        let j = i + 2;
        for (; j < input.length; j++) {
          const code = input.charCodeAt(j);
          if (code >= 0x40 && code <= 0x7e) break;
        }
        if (j >= input.length) {
          pendingEsc = input.slice(i);
          break;
        }
        i = j + 1;
        continue;
      }

      if (next === ']') {
        let j = i + 2;
        for (; j < input.length; j++) {
          const c = input[j];
          if (c === '\u0007') {
            break;
          }
          if (c === '\u001b' && input[j + 1] === '\\') {
            j += 1;
            break;
          }
        }
        if (j >= input.length) {
          pendingEsc = input.slice(i);
          break;
        }
        i = j + 1;
        continue;
      }

      if (next === 'P' || next === '_' || next === '^' || next === 'X') {
        let j = i + 2;
        for (; j < input.length; j++) {
          if (input[j] === '\u001b' && input[j + 1] === '\\') {
            break;
          }
        }
        if (j + 1 >= input.length) {
          pendingEsc = input.slice(i);
          break;
        }
        i = j + 2;
        continue;
      }

      i += 2;
      continue;
    }

    if (ch === '\r') {
      const next = input[i + 1];
      if (typeof next === 'undefined') {
        pendingEsc = '\r';
        break;
      }
      if (next === '\n') {
        lines.push(currentLine);
        currentLine = '';
        i += 2;
      } else {
        currentLine = '';
        i += 1;
      }
      continue;
    }

    if (ch === '\n') {
      lines.push(currentLine);
      currentLine = '';
      i += 1;
      continue;
    }

    if (ch === '\b') {
      currentLine = currentLine.slice(0, Math.max(0, currentLine.length - 1));
      i += 1;
      continue;
    }

    if (ch === '\0') {
      i += 1;
      continue;
    }

    currentLine += ch;
    i += 1;
  }

  if (!lines.length) return { text: currentLine, pendingEsc };
  return { text: `${lines.join('\n')}\n${currentLine}`, pendingEsc };
}

/**
 * 确保 winget 的安装程序哈希覆盖已启用
 * @param logBoxRef 日志容器的引用
 * @returns 是否成功启用（或已启用）
 */
export async function ensureInstallerHashOverrideEnabled(
  logBoxRef: React.RefObject<HTMLDivElement | null>,
): Promise<boolean> {
  appendLog(logBoxRef, '\n[哈希校验覆盖检查]\n');
  try {
    const isEnabled = await checkInstallerHashOverride();
    if (!isEnabled) {
      appendLog(
        logBoxRef,
        'InstallerHashOverride 未启用，正在尝试启用...\n',
      );
      const result = await enableInstallerHashOverride();
      if (
        result.startsWith('ERROR') ||
        result.toUpperCase().includes('FAILED')
      ) {
        appendLog(logBoxRef, `${result}\n`);
        return false;
      }

      appendLog(logBoxRef, `${result}\n`);
      const checkAgain = await checkInstallerHashOverride();
      if (checkAgain) {
        appendLog(logBoxRef, '哈希校验覆盖已启用\n');
        return true;
      }

      appendLog(logBoxRef, '哈希校验覆盖启用失败\n');
      return false;
    }

    appendLog(logBoxRef, '哈希校验覆盖已启用\n');
    return true;
  } catch (error) {
    const errorMsg = (error as Error)?.message || String(error);
    appendLog(logBoxRef, `${errorMsg}\n无法启用哈希校验覆盖\n`);
    return false;
  }
}

/**
 * 确保 winget 的代理设置已启用
 * 如果未启用，则尝试自动启用并记录日志
 * @param logBoxRef 日志容器的引用
 * @returns 是否成功启用（或已启用）
 */
export async function ensureProxyEnabled(
  logBoxRef: React.RefObject<HTMLDivElement | null>,
): Promise<boolean> {
  appendLog(logBoxRef, '\n[代理设置检查]\n');
  try {
    const isEnabled = await checkProxySettings();
    if (!isEnabled) {
      appendLog(logBoxRef, 'ProxyCommandLineOptions 未启用，正在尝试启用...\n');
      const result = await enableProxySettings();
      if (
        result.startsWith('ERROR') ||
        result.toUpperCase().includes('FAILED')
      ) {
        appendLog(logBoxRef, `${result}\n`);
        return false;
      }

      appendLog(logBoxRef, `${result}\n`);
      const checkAgain = await checkProxySettings();
      if (checkAgain) {
        appendLog(logBoxRef, '代理设置已启用\n');
        return true;
      }

      appendLog(logBoxRef, '代理设置启用失败，无法使用代理参数\n');
      return false;
    }

    appendLog(logBoxRef, '代理设置已启用\n');
    return true;
  } catch (error) {
    const errorMsg = (error as Error)?.message || String(error);
    appendLog(logBoxRef, `${errorMsg}\n无法使用代理参数\n`);
    return false;
  }
}

/**
 * 通用的 Modal 取消处理函数
 * @param execRunning 是否有正在执行的任务
 * @param onCancel 取消回调
 */
export function handleModalCancel(execRunning: boolean, onCancel: () => void) {
  if (!execRunning) {
    onCancel();
  }
}

/**
 * 构建基础的 winget 命令行参数
 * @param baseFlags 基础参数列表
 * @param options 配置选项
 * @returns 合并后的参数数组
 */
export function buildWingetFlags(
  baseFlags: string[],
  options: {
    isSilent?: boolean;
    isForce?: boolean;
    isInteractive?: boolean;
    isPurge?: boolean;
    includeUnknown?: boolean;
    ignoreHash?: boolean;
    useProxy?: boolean;
    proxyUrl?: string;
    customFlags?: string;
  },
): string[] {
  const flags = [...baseFlags];

  if (options.isInteractive) {
    flags.push('--interactive');
  } else {
    if (options.isSilent) flags.push('--silent');
    flags.push('--disable-interactivity');
  }

  if (options.isForce) flags.push('--force');
  if (options.isPurge) flags.push('--purge');
  if (options.includeUnknown) flags.push('--include-unknown');
  if (options.ignoreHash) flags.push('--ignore-security-hash');

  if (options.useProxy && options.proxyUrl) {
    flags.push('--proxy', options.proxyUrl);
  }

  if (options.customFlags?.trim()) {
    flags.push(...options.customFlags.trim().split(/\s+/));
  }

  return flags;
}

/**
 * 通用的 Modal 提交处理函数，包含代理检查和哈希校验覆盖逻辑
 * @param useProxy 是否使用代理
 * @param ignoreHash 是否忽略哈希校验
 * @param logBoxRef 日志容器引用
 * @param onStart 执行开始的回调函数
 * @param getFlags 获取执行参数的回调函数（可选）
 */
export async function handleModalOk(
  useProxy: boolean,
  ignoreHash: boolean,
  logBoxRef: React.RefObject<HTMLDivElement | null>,
  onStart: (flags?: string[]) => void,
  getFlags?: () => string[],
) {
  if (useProxy) {
    const success = await ensureProxyEnabled(logBoxRef);
    if (!success) return;
  }
  if (ignoreHash) {
    const success = await ensureInstallerHashOverrideEnabled(logBoxRef);
    if (!success) return;
  }
  if (getFlags) {
    onStart(getFlags());
  } else {
    onStart();
  }
}
