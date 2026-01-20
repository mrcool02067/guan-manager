import { Button } from 'antd';
import React, { useRef } from 'react';
import { useSearchAction } from '../../hooks/winget/action/useSearchAction.ts';
import { DetailModal, type DetailModalRef } from '../modal/DetailModal';
import { DownloadModal, type DownloadModalRef } from '../modal/DownloadModal';
import { InstallModal, type InstallModalRef } from '../modal/InstallModal';
import { SoftwareTable } from '../table/SoftwareTable.tsx';

/**
 * 搜索区域（输入框 + 结果表格）
 */
export const OnlineSearchTab: React.FC<{
  setError: (err: string) => void;
}> = ({ setError }) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    handleSearch,
    handleClearSearch,
  } = useSearchAction(setError);

  const installModalRef = useRef<InstallModalRef>(null);
  const downloadModalRef = useRef<DownloadModalRef>(null);
  const detailModalRef = useRef<DetailModalRef>(null);

  return (
    <>
      <SoftwareTable
        data={searchResults}
        loading={searchLoading}
        forceRemote={true}
        emptyText="未找到相关软件"
        searchable={true}
        searchPlaceholder="输入查询（如: vscode）"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
        enterButton="搜索"
        onDetail={(r) => detailModalRef.current?.openDetailByQuery(r.id, r.name)}
        onInstall={(r) => installModalRef.current?.handleInstallOne(r)}
        onDownload={(r) =>
          downloadModalRef.current?.handleDownloadInstaller(r)
        }
        headerExtra={
          <Button onClick={handleClearSearch} disabled={searchLoading}>
            清空
          </Button>
        }
      />

      <InstallModal ref={installModalRef} />

      <DownloadModal ref={downloadModalRef} />

      <DetailModal ref={detailModalRef} setError={setError} />
    </>
  );
};
