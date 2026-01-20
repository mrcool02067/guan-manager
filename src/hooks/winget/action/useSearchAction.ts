import { type Dispatch, type SetStateAction, useState } from 'react';
import { searchWinget } from '../../../services/winget/package';
import { useConfigSync } from '../../../sync/configSync.ts';
import type { WingetPackage } from '../../../types/winget.ts';

/**
 * useSearchAction 返回值的类型 definition
 */
export interface UseSearchActionReturn {
  /** 当前搜索框输入的查询字符串 */
  searchQuery: string;
  /** 设置搜索查询字符串的方法 */
  setSearchQuery: Dispatch<SetStateAction<string>>;
  /** 搜索结果列表 */
  searchResults: WingetPackage[];
  /** 设置搜索结果列表的方法 */
  setSearchResults: Dispatch<SetStateAction<WingetPackage[]>>;
  /** 搜索操作是否正在加载中 */
  searchLoading: boolean;
  /** 执行 winget 搜索操作 */
  handleSearch: (q: string) => Promise<void>;
  /** 清空搜索结果 */
  handleClearSearch: () => void;
}

/**
 * Winget 搜索逻辑 Hook
 * 处理软件搜索、搜索结果展示
 * @param {(err: string) => void} setError - 当搜索出错时调用的错误处理函数
 * @returns {UseSearchActionReturn} 包含搜索相关状态和操作方法的对象
 */
export function useSearchAction(
  setError: (err: string) => void,
): UseSearchActionReturn {
  const { data: config } = useConfigSync();

  // 搜索关键字状态
  const [searchQuery, setSearchQuery] = useState<string>('');
  // 搜索结果列表
  const [searchResults, setSearchResults] = useState<WingetPackage[]>([]);
  // 搜索加载状态
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  /**
   * 执行 winget 搜索
   * @param {string} q - 搜索关键字
   */
  async function handleSearch(q: string): Promise<void> {
    if (!q.trim()) return;
    setError('');
    setSearchLoading(true);
    try {
      const proxyUrl = config.useProxy
        ? `http://${config.proxyHost}:${config.proxyPort}`
        : undefined;
      // 默认搜索结果
      const res = await searchWinget(q, proxyUrl);
      setSearchResults(res);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSearchLoading(false);
    }
  }

  /**
   * 清空搜索结果
   */
  function handleClearSearch(): void {
    setSearchResults([]);
  }

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchLoading,
    handleSearch,
    handleClearSearch,
  };
}
