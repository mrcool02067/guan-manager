import { type Dispatch, type SetStateAction, useState } from 'react';
import { wingetFastDetail } from '../../../services/winget/package';
import type { ShowDetail } from '../../../types/winget.ts';
import { useConfigSync } from '../../../sync/configSync.ts';

/**
 * useDetailAction 返回值的类型 definition
 */
export interface UseDetailActionReturn {
  /** 当前选中的软件详情数据 */
  showDetail: ShowDetail | null;
  /** 设置详情数据的方法 */
  setShowDetail: Dispatch<SetStateAction<ShowDetail | null>>;
  /** 详情弹窗是否打开 */
  showDetailOpen: boolean;
  /** 设置详情弹窗打开状态的方法 */
  setShowDetailOpen: Dispatch<SetStateAction<boolean>>;
  /** 详情数据是否正在加载中 */
  showDetailLoading: boolean;
  /** 外部传入的 ID */
  externalId: string;
  /** 外部传入的名称 */
  externalName: string;
  /** 根据查询字符串（通常是 ID 或名称）打开详情弹窗并拉取数据 */
  openDetailByQuery: (id: string, name: string) => Promise<void>;
}

/**
 * Winget 软件详情 logic Hook
 * 处理详情弹窗的开关和数据的拉取
 * @param {(err: string) => void} setError - 当获取详情出错时调用的错误处理函数
 * @returns {UseDetailActionReturn} 包含详情相关状态和操作方法的对象
 */
export function useDetailAction(
  setError: (err: string) => void,
): UseDetailActionReturn {
  const { data: config } = useConfigSync();

  // 详情数据对象
  const [showDetail, setShowDetail] = useState<ShowDetail | null>(null);
  // 详情弹窗开关
  const [showDetailOpen, setShowDetailOpen] = useState<boolean>(false);
  // 详情加载状态
  const [showDetailLoading, setShowDetailLoading] = useState<boolean>(false);
  // 外部传入 ID
  const [externalId, setExternalId] = useState<string>('');
  // 外部传入名称
  const [externalName, setExternalName] = useState<string>('');

  /**
   * 打开详情弹窗并根据查询词拉取完整数据
   * @param {string} id - 软件的唯一标识
   * @param {string} name - 软件名称
   */
  async function openDetailByQuery(id: string, name: string): Promise<void> {
    setError('');
    setShowDetail(null);
    setExternalId(id);
    setExternalName(name);
    setShowDetailOpen(true);
    setShowDetailLoading(true);
    try {
      const proxyUrl = config.useProxy
        ? `http://${config.proxyHost}:${config.proxyPort}`
        : undefined;
      // 调用 winget show 服务获取详情，优先使用 ID
      const detail = await wingetFastDetail(id || name, proxyUrl);
      setShowDetail(detail);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setShowDetailLoading(false);
    }
  }

  return {
    showDetail,
    setShowDetail,
    showDetailOpen,
    setShowDetailOpen,
    showDetailLoading,
    externalId,
    externalName,
    openDetailByQuery,
  };
}
