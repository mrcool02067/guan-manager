import { Button, Flex, Input, Space, Table, type TableProps } from 'antd';
import React, { useState } from 'react';
import { getPackageRowKey, type WingetPackage } from '../../types/winget.ts';
import { SoftwareIcon } from '../display/SoftwareIcon.tsx';
import { VersionBadge } from '../display/VersionBadge.tsx';
import { TableCellWithMenu } from './TableCellWithMenu.tsx';

/**
 * 软件展示表格组件
 * 用于“已安装”、“可更新”和“在线搜索”页面
 */
export interface UnifiedSoftwareTableProps {
  data: WingetPackage[];
  loading?: boolean;
  /** 是否强制使用远程图标（在线搜索时为 true） */
  forceRemote?: boolean;
  /** 行选择配置（可更新页面批量更新时使用） */
  rowSelection?: TableProps<WingetPackage>['rowSelection'];
  /** 是否显示顶部搜索框 */
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearch?: (v: string) => void;
  enterButton?: React.ReactNode | boolean;
  headerExtra?: React.ReactNode;
  onRefresh?: () => void;
  emptyText?: string;
  /** 是否开启精简模式（隐藏 ID 和 源 列） */
  simplified?: boolean;
  /** 操作回调 */
  onDetail?: (r: WingetPackage) => void;
  onUpgrade?: (r: WingetPackage) => void;
  onInstall?: (r: WingetPackage) => void;
  onDownload?: (r: WingetPackage) => void;
  onUninstall?: (r: WingetPackage) => void;
  onHide?: (r: WingetPackage) => void;
}

export const SoftwareTable: React.FC<UnifiedSoftwareTableProps> = ({
  data,
  loading,
  forceRemote,
  rowSelection,
  searchable,
  searchPlaceholder = '搜索软件名称或 ID',
  searchValue,
  onSearchChange,
  onSearch,
  enterButton,
  headerExtra,
  onRefresh,
  emptyText = '暂无数据',
  simplified = false,
  onDetail,
  onUpgrade,
  onInstall,
  onDownload,
  onUninstall,
  onHide,
}) => {
  const [internalSearchText, setInternalSearchText] = useState('');
  // 增加一个本地状态用于实时显示输入内容，避免受控模式下的输入延迟
  const [displaySearchText, setDisplaySearchText] = useState(searchValue || '');
  const [pageSize, setPageSize] = useState(100);
  const [current, setCurrent] = useState(1);

  // 当外部 searchValue 改变时（例如点击清空按钮），同步本地显示状态
  React.useEffect(() => {
    if (searchValue !== undefined) {
      setDisplaySearchText(searchValue);
    }
  }, [searchValue]);

  const isControlledSearch = searchValue !== undefined;
  const currentSearchText = isControlledSearch
    ? searchValue
    : internalSearchText;

  // 本地过滤逻辑
  let filteredData = data;
  if (searchable && !onSearch && currentSearchText) {
    const lowerSearch = currentSearchText.toLowerCase();
    filteredData = filteredData.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(lowerSearch) ||
        (item.id || '').toLowerCase().includes(lowerSearch),
    );
  }

  const handleSearchChange = (v: string) => {
    setDisplaySearchText(v); // 立即更新本地显示，保证输入流畅
    if (onSearchChange) {
      onSearchChange(v);
    } else {
      setInternalSearchText(v);
    }
    setCurrent(1);
  };

  const handleSearch = (v: string) => {
    if (onSearch) {
      onSearch(v);
    } else {
      setInternalSearchText(v);
    }
    setCurrent(1);
  };

  const columns: TableProps<WingetPackage>['columns'] = (() => {
    const cols: TableProps<WingetPackage>['columns'] = [
      {
        title: '名称',
        dataIndex: 'name',
        sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
        render: (v, r) => (
          <TableCellWithMenu
            value={v}
            record={r}
            onDetail={onDetail}
            onUpgrade={onUpgrade}
            onDownload={onDownload}
            onUninstall={onUninstall}
            onHide={onHide}
            prefix={
              <SoftwareIcon id={r.id} name={r.name} forceRemote={forceRemote} />
            }
          />
        ),
      },
      {
        title: 'ID',
        dataIndex: 'id',
        responsive: simplified ? [] : ['lg'],
        sorter: (a, b) => (a.id || '').localeCompare(b.id || ''),
        render: (v, r) => (
          <TableCellWithMenu
            value={v}
            record={r}
            onDetail={onDetail}
            onUpgrade={onUpgrade}
            onDownload={onDownload}
            onUninstall={onUninstall}
            onHide={onHide}
          />
        ),
      },
    ];

    // 如果不是强制远程（即非在线搜索模式），则显示当前版本
    if (!forceRemote) {
      cols.push({
        title: '当前版本',
        key: 'currentVersion',
        // responsive: ['md'],
        sorter: (a, b) => {
          const vA = a.version || '';
          const vB = b.version || '';
          return (vA as string).localeCompare(vB as string);
        },
        render: (_, r) => {
          const version = r.version || '-';
          return (
            <TableCellWithMenu
              value={<VersionBadge version={version} type="current" />}
              record={r}
              onDetail={onDetail}
              onUpgrade={onUpgrade}
              onDownload={onDownload}
              onUninstall={onUninstall}
              onHide={onHide}
            />
          );
        },
      });
    }

    cols.push(
      {
        title: '最新版本',
        key: 'latestVersion',
        sorter: (a, b) => {
          const vA = a.available || (forceRemote ? a.version : '') || '';
          const vB = b.available || (forceRemote ? b.version : '') || '';
          return (vA as string).localeCompare(vB as string);
        },
        render: (_, r) => {
          const latest = r.available || (forceRemote ? r.version : '') || '-';
          const isUpgrade = !!r.available && r.available !== r.version;
          return (
            <TableCellWithMenu
              value={
                <VersionBadge
                  version={latest}
                  type={isUpgrade ? 'upgrade' : 'latest'}
                />
              }
              record={r}
              onDetail={onDetail}
              onUpgrade={onUpgrade}
              onDownload={onDownload}
              onUninstall={onUninstall}
              onHide={onHide}
            />
          );
        },
      },
      {
        title: '源',
        dataIndex: 'source',
        responsive: simplified ? [] : ['xl'],
        sorter: (a, b) => (a.source || '').localeCompare(b.source || ''),
        // filters: [
        //   { text: 'Winget', value: 'winget' },
        //   { text: 'MSStore', value: 'msstore' },
        // ],
        onFilter: (value, record) => {
          const s = (record.source || '').toLowerCase();
          return s.includes(String(value).toLowerCase());
        },
        render: (v, r) => (
          <TableCellWithMenu
            value={v || '-'}
            record={r}
            onDetail={onDetail}
            onUpgrade={onUpgrade}
            onDownload={onDownload}
            onUninstall={onUninstall}
            onHide={onHide}
          />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: simplified ? 100 : 180,
        fixed: 'right' as const,
        responsive: simplified ? [] : ['xl'],
        render: (_, r) => (
          <Space size="middle">
            {onDetail && !simplified && (
              <Button type="link" size="small" onClick={() => onDetail(r)}>
                详情
              </Button>
            )}
            {onUpgrade && (
              <Button type="link" size="small" onClick={() => onUpgrade(r)}>
                更新
              </Button>
            )}
            {onInstall && (
              <Button type="link" size="small" onClick={() => onInstall(r)}>
                安装
              </Button>
            )}
            {onDownload && !simplified && (
              <Button type="link" size="small" onClick={() => onDownload(r)}>
                仅下载
              </Button>
            )}
            {onUninstall && !simplified && (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => onUninstall(r)}
              >
                卸载
              </Button>
            )}
          </Space>
        ),
      },
    );

    return cols;
  })();

  return (
    <Flex vertical gap="small">
      {(searchable || headerExtra || onRefresh) && (
        <Flex justify="flex-start" align="center" gap="small">
          {searchable && (
            <Input.Search
              placeholder={searchPlaceholder}
              allowClear
              value={displaySearchText}
              enterButton={enterButton}
              loading={loading && !!onSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onSearch={handleSearch}
              style={{ width: '30%' }}
            />
          )}
          {onRefresh && (
            <Button type="primary" onClick={onRefresh} disabled={loading}>
              刷新
            </Button>
          )}
          {headerExtra}
        </Flex>
      )}
      <Table
        size="small"
        showSorterTooltip={false}
        rowKey={getPackageRowKey}
        loading={loading}
        locale={{
          emptyText: loading ? '正在加载数据...' : emptyText,
        }}
        rowSelection={rowSelection}
        dataSource={loading ? [] : filteredData}
        columns={columns}
        pagination={{
          current: current,
          pageSize: pageSize,
          showSizeChanger: true,
          onChange: (page, size) => {
            setCurrent(page);
            setPageSize(size);
          },
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />
    </Flex>
  );
};
