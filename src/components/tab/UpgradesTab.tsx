import { Button, Flex, Segmented } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useFetchData } from '../../hooks/winget/useFetchData.ts';
import { listUpgrades } from '../../services/winget/package.ts';
import { checkProxySettings } from '../../services/winget/system.ts';
import { useConfigSync } from '../../sync/configSync.ts';
import { getPackageRowKey, type WingetPackage } from '../../types/winget.ts';
import { DetailModal, type DetailModalRef } from '../modal/DetailModal';
import { DownloadModal, type DownloadModalRef } from '../modal/DownloadModal';
import {
  UninstallModal,
  type UninstallModalRef,
} from '../modal/UninstallModal';
import { UpgradeModal, type UpgradeModalRef } from '../modal/UpgradeModal';
import { SoftwareTable } from '../table/SoftwareTable.tsx';

/**
 * 可更新包列表（表格）
 */
export const UpgradesTab: React.FC<{
  setError: (err: string) => void;
  onCountChange?: (count: number) => void;
}> = ({ setError, onCountChange }) => {
  const { data: config, sync: syncConfig } = useConfigSync();
  const hideUpdateList = config.hideUpdateList || [];
  const hideUpdateIds = hideUpdateList.map((item) => item.id);

  const {
    data,
    loading,
    refresh,
    setData: setUpgrades,
  } = useFetchData<WingetPackage[]>(async () => {
    if (!config.useProxy) return listUpgrades(undefined);
    const isProxyEnabled = await checkProxySettings();
    if (!isProxyEnabled) {
      console.warn('代理未启用，已自动禁用代理');
      await syncConfig('useProxy', false);
      return listUpgrades(undefined);
    }
    return listUpgrades(`http://${config.proxyHost}:${config.proxyPort}`);
  }, []);
  const filteredData = data.filter((item) => !hideUpdateIds.includes(item.id));

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

  useEffect(() => {
    onCountChange?.(filteredData.length);
  }, [filteredData.length, onCountChange]);

  const upgradeModalRef = useRef<UpgradeModalRef>(null);
  const uninstallModalRef = useRef<UninstallModalRef>(null);
  const downloadModalRef = useRef<DownloadModalRef>(null);
  const detailModalRef = useRef<DetailModalRef>(null);

  const [selectedUpgradeIds, setSelectedUpgradeIds] = useState<string[]>([]);

  return (
    <>
      <SoftwareTable
        data={filteredData}
        loading={loading}
        emptyText="暂无可更新项"
        rowSelection={{
          selectedRowKeys: selectedUpgradeIds,
          onChange: (keys) => setSelectedUpgradeIds(keys as string[]),
          selections: true,
        }}
        searchable={true}
        searchPlaceholder=""
        onDetail={(r) =>
          detailModalRef.current?.openDetailByQuery(r.id, r.name)
        }
        onUpgrade={(r) => upgradeModalRef.current?.handleUpgradeOne(r)}
        onUninstall={(rec) =>
          uninstallModalRef.current?.handleUninstallOne({
            id: rec.id,
            name: rec.name,
            source: rec.source,
          })
        }
        onDownload={(r) => downloadModalRef.current?.handleDownloadInstaller(r)}
        onHide={async (r) => {
          try {
            const newList = [...hideUpdateList, { id: r.id, name: r.name }];
            await syncConfig('hideUpdateList', newList);
          } catch (e) {
            setError(String((e as Error)?.message ?? e));
          }
        }}
        onRefresh={handleRefresh}
        simplified={config.tableMode === 'simplified'}
        headerExtra={
          <Flex
            gap="small"
            align="center"
            justify="space-between"
            style={{ width: '100%' }}
          >
            <Flex gap="small" align="center">
              <Button
                type="primary"
                disabled={!selectedUpgradeIds.length}
                onClick={() => {
                  const targets = filteredData.filter((u) => {
                    const rowKey = getPackageRowKey(u);
                    return selectedUpgradeIds.includes(rowKey);
                  });
                  upgradeModalRef.current?.handleUpgradeSelected(targets);
                }}
              >
                更新所选
              </Button>
              <span>
                {selectedUpgradeIds.length > 0 &&
                  `已选 ${selectedUpgradeIds.length} 项`}
              </span>
            </Flex>

            <Segmented
              options={[
                { label: '详细版', value: 'detailed' },
                { label: '精简版', value: 'simplified' },
              ]}
              value={config.tableMode}
              onChange={(v) => syncConfig({ tableMode: v as string })}
            />
          </Flex>
        }
      />

      <UpgradeModal
        ref={upgradeModalRef}
        setUpgrades={setUpgrades}
        selectedIds={selectedUpgradeIds}
        setSelectedIds={setSelectedUpgradeIds}
      />

      <UninstallModal
        ref={uninstallModalRef}
        installed={[]}
        refreshAll={refresh}
      />

      <DownloadModal ref={downloadModalRef} />

      <DetailModal ref={detailModalRef} />
    </>
  );
};
