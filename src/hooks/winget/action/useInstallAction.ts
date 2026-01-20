import { listen } from '@tauri-apps/api/event';
import { message } from 'antd';
import { type RefObject, useState } from 'react';
import { useLogTerminal } from '../../useLogTerminal.ts';
import { installStream } from '../../../services/winget/package';
import { stopTask } from '../../../services/winget/system';
import type {
  WingetFinishedPayload,
  WingetLogPayload,
} from '../../../types/winget.ts';

/**
 * useInstallAction 返回值的类型 definition
 */
export interface UseInstallActionReturn {
  /** 安装确认弹窗是否打开 */
  installModalOpen: boolean;
  /** 设置安装确认弹窗状态的方法 */
  setInstallModalOpen: (open: boolean) => void;
  /** 当前选中的待安装目标对象 */
  installTarget: { id: string; name: string } | null;
  /** 安装进程是否正在后台运行 */
  execRunning: boolean;
  /** 日志展示区域的 DOM 引用 */
  logBoxRef: RefObject<HTMLDivElement | null>;
  /** 日志滚动区域的 DOM 引用 */
  logScrollRef: RefObject<HTMLDivElement | null>;
  /** 打开单个软件安装的确认弹窗。r: 待安装的软件条目 */
  handleInstallOne: (r: { id: string; name: string }) => void;
  /** 正式开始执行 winget 安装流命令 */
  startInstallExecution: (flags?: string[]) => Promise<void>;
  /** 手动终止正在进行的安装进程 */
  handleStopInstall: () => Promise<void>;
}

/**
 * Winget 安装逻辑 Hook
 * @returns {UseInstallActionReturn} 包含安装相关状态和操作方法的对象
 */
export function useInstallAction(): UseInstallActionReturn {
  // 安装确认弹窗开关
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  // 当前弹窗指向的安装目标
  const [installTarget, setInstallTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // 安装进程是否运行中
  const [execRunning, setExecRunning] = useState<boolean>(false);
  // 是否手动终止了进程
  const [execStopped, setExecStopped] = useState<boolean>(false);

  const {
    logBoxRef,
    logScrollRef,
    clear,
    append,
    cleanupListeners,
    setUnlistenLog,
    setUnlistenFinish,
  } = useLogTerminal();

  /**
   * 打开单个安装确认弹窗
   * @param {Object} r - 待安装的软件条目
   */
  function handleInstallOne(r: { id: string; name: string }): void {
    setInstallTarget(r);
    setExecRunning(false);
    setInstallModalOpen(true);
    setExecStopped(false);
    // 打开时清空之前的日志
    setTimeout(() => {
      clear();
    }, 0);
  }

  /**
   * 开始执行安装流
   */
  async function startInstallExecution(flags: string[] = []): Promise<void> {
    if (!installTarget) return;
    setExecRunning(true);
    setExecStopped(false);
    const id = installTarget.id;

    // 1. 监听日志输出事件
    const unlistenLog = await listen<WingetLogPayload>(
      'winget-install-log',
      (ev) => {
        const p = ev.payload;
        if (p && p.id === id && typeof p.line === 'string') {
          append(p.line);
        }
      },
    );

    // 2. 监听进程结束事件
    const unlistenFinish = await listen<WingetFinishedPayload>(
      'winget-install-finished',
      (ev) => {
        const p = ev.payload;
        if (p && p.id === id) {
          setExecRunning(false);
          if (p.success) {
            message.success('软件安装成功');
          } else {
            if (execStopped) message.warning('已终止安装');
            else message.error('安装失败');
          }
          cleanupListeners();
        }
      },
    );

    setUnlistenLog(unlistenLog);
    setUnlistenFinish(unlistenFinish);

    try {
      // 调用后端安装流接口
      await installStream(id, flags);
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
      setExecRunning(false);
      cleanupListeners();
    }
  }

  /**
   * 终止安装进程
   */
  async function handleStopInstall(): Promise<void> {
    if (!installTarget) return;
    try {
      await stopTask(installTarget.id);
      setExecStopped(true);
      message.warning('已请求终止安装');
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
    }
  }

  return {
    installModalOpen,
    setInstallModalOpen,
    installTarget,
    execRunning,
    logBoxRef,
    logScrollRef,
    handleInstallOne,
    startInstallExecution,
    handleStopInstall,
  };
}
