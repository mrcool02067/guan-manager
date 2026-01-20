import { listen } from '@tauri-apps/api/event';
import { message } from 'antd';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useState,
} from 'react';
import { useLogTerminal } from '../../useLogTerminal.ts';
import { DEFAULT_UNINSTALL_FLAGS } from '../../../services/winget/constants';
import {
  uninstallById,
  uninstallStream,
} from '../../../services/winget/package';
import { stopTask } from '../../../services/winget/system';
import type {
  WingetFinishedPayload,
  WingetLogPayload,
  WingetPackage,
} from '../../../types/winget.ts';
import { getPackageRowKey } from '../../../types/winget.ts';

/**
 * useUninstallAction 返回值的类型 definition
 */
export interface UseUninstallActionReturn {
  /** 是否正在执行批量卸载操作 */
  uninstalling: boolean;
  /** 已安装软件列表中当前选中的软件 ID 集合 */
  selectedInstalledIds: string[];
  /** 设置选中软件 ID 集合的方法 */
  setSelectedUpgradeIds: Dispatch<SetStateAction<string[]>>;
  /** 设置选中软件 ID 集合的方法 (别名，用于向后兼容) */
  setSelectedInstalledIds: Dispatch<SetStateAction<string[]>>;
  /** 触发批量卸载已选软件的逻辑 */
  handleUninstallSelected: () => Promise<void>;

  /** 卸载确认弹窗是否打开 */
  uninstallModalOpen: boolean;
  /** 设置卸载确认弹窗状态的方法 */
  setUninstallModalOpen: (open: boolean) => void;
  /** 当前选中的待卸载目标对象 */
  uninstallTarget: { id: string; name: string; source?: string | null } | null;
  /** 卸载进程是否正在后台运行 */
  execRunning: boolean;
  /** 日志展示区域的 DOM 引用 */
  logBoxRef: RefObject<HTMLDivElement | null>;
  /** 日志滚动区域的 DOM 引用 */
  logScrollRef: RefObject<HTMLDivElement | null>;
  /** 打开单个软件卸载的确认弹窗 */
  handleUninstallOne: (r: {
    id: string;
    name: string;
    source?: string | null;
  }) => void;
  /** 正式开始执行 winget 卸载流命令 */
  startUninstallExecution: (flags?: string[]) => Promise<void>;
  /** 手动终止正在进行的卸载进程 */
  handleStopUninstall: () => Promise<void>;
}

/**
 * Winget 卸载逻辑 Hook
 * 处理已安装软件的卸载流程，包括单个卸载和批量卸载
 * @param {WingetPackage[]} installed - 当前内存中的已安装软件列表数据
 * @param {() => Promise<unknown>} refreshAll - 卸载完成后用于刷新数据的回调函数
 * @returns {UseUninstallActionReturn} 包含卸载相关状态和操作方法的对象
 */
export function useUninstallAction(
  installed: WingetPackage[],
  refreshAll: () => Promise<unknown>,
  externalSelectedIds?: string[],
  externalSetSelectedIds?: Dispatch<SetStateAction<string[]>>,
): UseUninstallActionReturn {
  // 批量卸载加载状态
  const [uninstalling, setUninstalling] = useState<boolean>(false);
  // 选中的已安装软件 ID 列表
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  const selectedInstalledIds = externalSelectedIds ?? internalSelectedIds;
  const setSelectedInstalledIds =
    externalSetSelectedIds ?? setInternalSelectedIds;

  // 卸载确认弹窗状态
  const [uninstallModalOpen, setUninstallModalOpen] = useState<boolean>(false);
  const [uninstallTarget, setUninstallTarget] = useState<{
    id: string;
    name: string;
    source?: string | null;
  } | null>(null);
  const [execRunning, setExecRunning] = useState<boolean>(false);
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
   * 打开单个卸载确认弹窗
   */
  function handleUninstallOne(r: {
    id: string;
    name: string;
    source?: string | null;
  }): void {
    setUninstallTarget(r);
    setExecRunning(false);
    setUninstallModalOpen(true);
    setExecStopped(false);
    // 打开时清空之前的日志
    setTimeout(() => {
      clear();
    }, 0);
  }

  /**
   * 开始执行卸载流
   */
  async function startUninstallExecution(flags: string[] = []): Promise<void> {
    if (!uninstallTarget) return;
    setExecRunning(true);
    setExecStopped(false);
    const id = uninstallTarget.id;

    // 1. 监听日志输出事件
    const unlistenLog = await listen<WingetLogPayload>(
      'winget-uninstall-log',
      (ev) => {
        const p = ev.payload;
        if (p && p.id === id && typeof p.line === 'string') {
          append(p.line);
        }
      },
    );

    // 2. 监听进程结束事件
    const unlistenFinish = await listen<WingetFinishedPayload>(
      'winget-uninstall-finished',
      (ev) => {
        const p = ev.payload;
        if (p && p.id === id) {
          setExecRunning(false);
          if (p.success) {
            message.success('软件卸载成功');
            void refreshAll();
          } else {
            if (execStopped) message.warning('已终止卸载');
            else message.error('卸载失败');
          }
          cleanupListeners();
        }
      },
    );

    setUnlistenLog(unlistenLog);
    setUnlistenFinish(unlistenFinish);

    try {
      await uninstallStream(id, uninstallTarget.source, flags);
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
      setExecRunning(false);
      cleanupListeners();
    }
  }

  /**
   * 终止卸载进程
   */
  async function handleStopUninstall(): Promise<void> {
    if (!uninstallTarget) return;
    try {
      await stopTask(uninstallTarget.id);
      setExecStopped(true);
      message.warning('已请求终止卸载');
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
    }
  }

  async function handleUninstallSelected(): Promise<void> {
    if (!selectedInstalledIds.length) return;
    setUninstalling(true);
    try {
      let successCount = 0;
      let failCount = 0;
      // 根据 ID 过滤出待卸载的完整条目信息
      const itemsToUninstall = installed.filter((it) => {
        const rowKey = getPackageRowKey(it);
        return selectedInstalledIds.includes(rowKey);
      });

      // 串行执行卸载
      for (const item of itemsToUninstall) {
        try {
          await uninstallById(
            item.id,
            DEFAULT_UNINSTALL_FLAGS,
            item.source,
          );
          successCount++;
        } catch (e) {
          failCount++;
          console.error(`Failed to uninstall ${item.id}:`, e);
        }
      }

      if (successCount > 0) {
        message.info(
          `已尝试卸载 ${successCount} 项，正在刷新列表以确认结果...`,
        );
        // 等待一段时间让系统完成卸载注册表更新，再刷新列表
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refreshAll();
        // 清空选中项
        setSelectedInstalledIds([]);
        message.success(
          `批量卸载检查完成 (成功: ${successCount}${failCount > 0 ? `, 失败: ${failCount}` : ''})`,
        );
      } else if (failCount > 0) {
        message.error(`批量卸载失败，请检查错误日志`);
      }
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
    } finally {
      setUninstalling(false);
    }
  }

  return {
    uninstalling,
    selectedInstalledIds,
    setSelectedUpgradeIds: setSelectedInstalledIds,
    setSelectedInstalledIds,
    handleUninstallSelected,
    uninstallModalOpen,
    setUninstallModalOpen,
    uninstallTarget,
    execRunning,
    logBoxRef,
    logScrollRef,
    handleUninstallOne,
    startUninstallExecution,
    handleStopUninstall,
  };
}
