import { Button } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useFetchData } from '../../hooks/winget/useFetchData.ts';
import { listInstalled } from '../../services/winget/package';
import type { WingetPackage } from '../../types/winget.ts';
import { DetailModal, type DetailModalRef } from '../modal/DetailModal';
import { UninstallModal, type UninstallModalRef } from '../modal/UninstallModal';
import { SoftwareTable } from '../table/SoftwareTable.tsx';

/**
 * 已安装包列表（表格）
 */
export const InstalledTab: React.FC<{
  setError: (err: string) => void;
}> = ({ setError }) => {
  const { data, loading, refresh } = useFetchData<WingetPackage[]>(
    listInstalled,
    [],
  );

  const uninstallModalRef = useRef<UninstallModalRef>(null);
  const detailModalRef = useRef<DetailModalRef>(null);

  const [selectedInstalledIds, setSelectedInstalledIds] = useState<string[]>(
    [],
  );

  async function handleRefresh() {
    setError('');
    try {
      await refresh();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  }

  useEffect(() => {
    void handleRefresh();
  }, []);

  return (
    <>
      <SoftwareTable
        data={data}
        loading={loading}
        searchable={true}
        searchPlaceholder="搜索已安装软件名称或 ID"
        emptyText="暂无已安装软件"
        rowSelection={{
          selectedRowKeys: selectedInstalledIds,
          onChange: (keys) => setSelectedInstalledIds(keys as string[]),
          selections: true,
        }}
        onUninstall={(r) => uninstallModalRef.current?.handleUninstallOne(r)}
        onDetail={(r) => detailModalRef.current?.openDetailByQuery(r.id, r.name)}
        onRefresh={handleRefresh}
        headerExtra={
          <Button
            danger
            type="primary"
            disabled={!selectedInstalledIds.length}
            loading={uninstallModalRef.current?.uninstalling}
            onClick={() => uninstallModalRef.current?.handleUninstallSelected()}
            style={{ width: 'min-content' }}
          >
            卸载所选
          </Button>
        }
      />

      <UninstallModal
        ref={uninstallModalRef}
        installed={data}
        refreshAll={refresh}
        selectedIds={selectedInstalledIds}
        setSelectedIds={setSelectedInstalledIds}
      />

      <DetailModal ref={detailModalRef} />
    </>
  );
};
