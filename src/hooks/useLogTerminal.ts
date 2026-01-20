import { type RefObject, useRef } from 'react';
import { appendLogAndScroll, clearLog } from '../utils/modalUtils';

/**
 * 统一管理“实时日志终端”的状态与操作。
 * 主要用于 Modal 内的日志展示：追加日志、自动滚动、清空，以及事件监听器的注册/清理。
 */
export interface LogTerminalState {
  /** 日志内容容器（用于写入 textContent） */
  logBoxRef: RefObject<HTMLDivElement | null>;
  /** 日志滚动容器（用于控制 scrollTop） */
  logScrollRef: RefObject<HTMLDivElement | null>;
  /** 日志事件监听的取消函数引用（用于释放 listen） */
  unlistenLogRef: RefObject<(() => void) | null>;
  /** 结束事件监听的取消函数引用（用于释放 listen） */
  unlistenFinishRef: RefObject<(() => void) | null>;
  /** 清空当前日志内容（并重置 CR 处理状态） */
  clear: () => void;
  /** 追加日志内容并自动滚动到底部 */
  append: (text: string) => void;
  /** 清理已注册的事件监听器，并重置对应引用 */
  cleanupListeners: () => void;
  /** 设置日志事件监听的取消函数（用于外部完成 listen 后回填） */
  setUnlistenLog: (fn: (() => void) | null) => void;
  /** 设置结束事件监听的取消函数（用于外部完成 listen 后回填） */
  setUnlistenFinish: (fn: (() => void) | null) => void;
}

/**
 * 实时日志终端 Hook。
 * 返回 DOM 引用与一组通用操作，使业务 Hook 不需要重复维护日志相关变量。
 */
export function useLogTerminal(): LogTerminalState {
  const logBoxRef = useRef<HTMLDivElement | null>(null);
  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const unlistenLogRef = useRef<(() => void) | null>(null);
  const unlistenFinishRef = useRef<(() => void) | null>(null);

  return {
    logBoxRef,
    logScrollRef,
    unlistenLogRef,
    unlistenFinishRef,
    clear: () => clearLog(logBoxRef),
    append: (text: string) => appendLogAndScroll(logBoxRef, logScrollRef, text),
    cleanupListeners: () => {
      unlistenLogRef.current?.();
      unlistenFinishRef.current?.();
      unlistenLogRef.current = null;
      unlistenFinishRef.current = null;
    },
    setUnlistenLog: (fn) => {
      unlistenLogRef.current = fn;
    },
    setUnlistenFinish: (fn) => {
      unlistenFinishRef.current = fn;
    },
  };
}
