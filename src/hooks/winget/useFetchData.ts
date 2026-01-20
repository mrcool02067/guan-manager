import { useRef, useState } from 'react';

/**
 * 通用的数据获取 Hook
 * 封装了加载状态、数据存储以及刷新逻辑
 */
export function useFetchData<T>(fetchFn: () => Promise<T>, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetchFnRef.current();
      setData(res);
      return res;
    } finally {
      setLoading(false);
    }
  }

  return { data, setData, loading, refresh };
}
