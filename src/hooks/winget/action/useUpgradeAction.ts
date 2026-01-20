import { listen } from '@tauri-apps/api/event';
import { message } from 'antd';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from 'react';
import { useLogTerminal } from '../../useLogTerminal.ts';
import { stopUpgrade, upgradeStream } from '../../../services/winget/package';
import {
  getPackageRowKey,
  type WingetFinishedPayload,
  type WingetLogPayload,
  type WingetPackage,
} from '../../../types/winget.ts';

/**
 * useUpgradeAction 返回值的类型定义
 */
export interface UseUpgradeActionReturn {
  /** 是否正在执行批量更新操作 */
  upgrading: boolean;
  /** 可更新列表中当前选中的软件 ID 集合 */
  selectedUpgradeIds: string[];
  /** 设置选中软件 ID 集合的方法 */
  setSelectedUpgradeIds: Dispatch<SetStateAction<string[]>>;
  /** 更新确认弹窗是否打开 */
  confirmUpgradeOpen: boolean;
  /** 设置更新确认弹窗是否打开的方法 */
  setConfirmUpgradeOpen: Dispatch<SetStateAction<boolean>>;
  confirmTarget: WingetPackage | null;
  /** 当前弹窗指向的多个更新目标（批量更新时使用） */
  confirmTargets: WingetPackage[] | null;
  /** 更新进程是否正在后台运行 */
  execRunning: boolean;
  /** 更新日志展示区域的 DOM 引用 */
  logBoxRef: RefObject<HTMLDivElement | null>;
  /** 更新日志滚动区域的 DOM 引用 */
  logScrollRef: RefObject<HTMLDivElement | null>;
  /** 处理批量更新所选软件的逻辑 */
  handleUpgradeSelected: (targets: WingetPackage[]) => void;
  /** 打开单个软件更新的确认弹窗。r: 待更新的软件条目 */
  handleUpgradeOne: (r: WingetPackage) => void;
  /** 正式开始执行 winget 更新流命令 */
  startUpgradeExecution: (flags?: string[]) => Promise<void>;
  /** 手动终止正在进行的更新进程 */
  handleStopUpgrade: () => Promise<void>;
}

/**
 * Winget 更新逻辑 Hook
 * 处理软件更新相关的状态管理、事件监听及命令执行
 * @param {Dispatch<SetStateAction<WingetPackage[]>>} setUpgrades - 用于更新全局更新列表状态的方法
 * @returns {UseUpgradeActionReturn} 包含更新相关状态和操作方法的对象
 */
export function useUpgradeAction(
  setUpgrades: Dispatch<SetStateAction<WingetPackage[]>>,
  externalSelectedIds?: string[],
  externalSetSelectedIds?: Dispatch<SetStateAction<string[]>>,
): UseUpgradeActionReturn {
  // 批量更新状态
  const [upgrading, setUpgrading] = useState<boolean>(false);
  // 内部选中的更新 ID 列表 (如果没传外部的)
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  const selectedUpgradeIds = externalSelectedIds ?? internalSelectedIds;
  const setSelectedUpgradeIds =
    externalSetSelectedIds ?? setInternalSelectedIds;
  // 更新确认弹窗开关
  const [confirmUpgradeOpen, setConfirmUpgradeOpen] = useState<boolean>(false);
  // 当前弹窗指向的单个更新目标
  const [confirmTarget, setConfirmTarget] = useState<WingetPackage | null>(
    null,
  );
  // 当前弹窗指向的多个更新目标
  const [confirmTargets, setConfirmTargets] = useState<WingetPackage[] | null>(
    null,
  );
  // 更新进程是否运行中
  const [execRunning, setExecRunning] = useState<boolean>(false);
  // 是否手动终止了进程
  const execStoppedRef = useRef<boolean>(false);

  const {
    logBoxRef,
    logScrollRef,
    unlistenFinishRef,
    clear,
    append,
    cleanupListeners,
    setUnlistenLog,
    setUnlistenFinish,
  } = useLogTerminal();

  /**
   * 处理批量更新所选项
   */
  function handleUpgradeSelected(targets: WingetPackage[]): void {
    if (!targets.length) return;
    setConfirmTargets(targets);
    setConfirmTarget(null);
    setExecRunning(false);
    setConfirmUpgradeOpen(true);
    execStoppedRef.current = false;
    // 打开时清空之前的日志
    clear();
  }

  /**
   * 打开单个更新确认弹窗
   * @param {WingetPackage} r - 待更新的软件条目
   */
  function handleUpgradeOne(r: WingetPackage): void {
    setConfirmTarget(r);
    setConfirmTargets(null);
    setExecRunning(false);
    setConfirmUpgradeOpen(true);
    execStoppedRef.current = false;
    // 打开时清空之前的日志
    clear();
  }

  /**
   * 开始执行更新流
   */
  async function startUpgradeExecution(flags: string[] = []): Promise<void> {
    const targets = confirmTargets || (confirmTarget ? [confirmTarget] : []);
    if (!targets.length) return;

    setExecRunning(true);
    execStoppedRef.current = false;

    // 如果是批量，显示总进度
    if (targets.length > 1) {
      setUpgrading(true);
    }

    let successCount = 0;
    let failCount = 0;
    let stoppedCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const id = target.id;

      // 如果手动终止了，直接跳出循环
      if (execStoppedRef.current) break;

      // 在日志中添加当前正在更新的项目提示
      append(
        `\n>>> [${i + 1}/${targets.length}] 正在更新: ${target.name} (${id})...\n`,
      );

      // 1. 监听日志输出事件
      const unlistenLog = await listen<WingetLogPayload>(
        'winget-upgrade-log',
        (ev) => {
          const p = ev.payload;
          if (p && p.id === id && typeof p.line === 'string') {
            append(p.line);
          }
        },
      );

      // 2. 监听进程结束事件
      // 使用 Promise 来等待当前这个包更新结束
      const upgradePromise = new Promise<boolean>((resolve) => {
        listen<WingetFinishedPayload>('winget-upgrade-finished', (ev) => {
          const p = ev.payload;
          if (p && p.id === id) {
            unlistenLog();
            if (unlistenFinishRef.current) {
              unlistenFinishRef.current();
            }
            if (p.success) {
              setUpgrades((prev) => prev.filter((u) => u.id !== id));
              // 匹配表格的 rowKey
              const rowKey = getPackageRowKey(target);
              setSelectedUpgradeIds((prev) =>
                prev.filter((key) => key !== rowKey),
              );
              resolve(true);
            } else {
              resolve(false);
            }
          }
        }).then((unlisten) => {
          setUnlistenFinish(unlisten);
        });
      });

      setUnlistenLog(unlistenLog);

      try {
        await upgradeStream(id, flags);
        const success = await upgradePromise;
        if (success) {
          successCount++;
          append(
            `\n<<< [${i + 1}/${targets.length}] 更新结束: ${target.name} (${id})，结果: 成功\n`,
          );
        } else {
          if (execStoppedRef.current) {
            stoppedCount++;
            append(
              `\n<<< [${i + 1}/${targets.length}] 更新结束: ${target.name} (${id})，结果: 已终止\n`,
            );
            cleanupListeners();
            break;
          }
          failCount++;
          append(
            `\n<<< [${i + 1}/${targets.length}] 更新结束: ${target.name} (${id})，结果: 失败\n`,
          );
        }
      } catch (e) {
        if (execStoppedRef.current) {
          stoppedCount++;
          append(
            `\n<<< [${i + 1}/${targets.length}] 更新结束: ${target.name} (${id})，结果: 已终止\n`,
          );
          cleanupListeners();
          break;
        }
        failCount++;
        append(
          `\n<<< [${i + 1}/${targets.length}] 更新结束: ${target.name} (${id})，结果: 失败\n`,
        );
        console.error(`Failed to upgrade ${id}:`, e);
        cleanupListeners();
      }

      // 清理当前包的监听器
      cleanupListeners();
    }

    setExecRunning(false);
    setUpgrading(false);

    if (targets.length > 1) {
      if (successCount > 0)
        message.success(`批量更新完成，成功 ${successCount} 项`);
      if (failCount > 0) message.error(`有 ${failCount} 项更新失败`);
      if (stoppedCount > 0 || execStoppedRef.current)
        message.warning('已终止批量更新');
    } else if (targets.length === 1) {
      if (successCount === 1) message.success('已更新当前软件');
      else if (!execStoppedRef.current) message.error('更新失败');
      else message.warning('已终止更新');
    }
  }

  /**
   * 终止更新进程
   */
  async function handleStopUpgrade(): Promise<void> {
    const targets = confirmTargets || (confirmTarget ? [confirmTarget] : []);
    if (!targets.length) return;

    execStoppedRef.current = true;
    try {
      // 如果正在执行中，尝试停止当前正在运行的那个
      for (const target of targets) {
        await stopUpgrade(target.id);
      }
      message.warning('已请求终止更新');
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
    }
  }

  return {
    upgrading,
    selectedUpgradeIds,
    setSelectedUpgradeIds,
    confirmUpgradeOpen,
    setConfirmUpgradeOpen,
    confirmTarget,
    confirmTargets,
    execRunning,
    logBoxRef,
    logScrollRef,
    handleUpgradeSelected,
    handleUpgradeOne,
    startUpgradeExecution,
    handleStopUpgrade,
  };
}
