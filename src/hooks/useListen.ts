import type { Event, UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

// 事件处理函数映射类型
export type HandlerMap<T = unknown> = {
  [eventName: string]: (event: Event<T>) => void;
};

/**
 * 监听 Tauri 事件的自定义 Hook
 * @param handlers 事件名到处理函数的映射对象
 */
export function useListen<T>(handlers: HandlerMap<T>): void {
  useEffect(() => {
    // 使用 Promise.all 同时注册所有事件监听
    const unlistenList: Promise<UnlistenFn[]> = Promise.all(
      Object.entries(handlers).map(
        async ([event, handler]: [
          string,
          (event: Event<T>) => void,
        ]): Promise<UnlistenFn> => await listen<T>(event, handler),
      ),
    );

    // 卸载时移除所有监听
    return () => {
      void unlistenList.then((unlisten: UnlistenFn[]): void => {
        for (const fn of unlisten) {
          fn();
        }
      });
    };
  }, [handlers]);
}
