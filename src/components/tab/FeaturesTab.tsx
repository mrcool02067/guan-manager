import { Table, type TableProps } from 'antd';
import React, { useEffect } from 'react';
import { useFetchData } from '../../hooks/winget/useFetchData.ts';
import { getFeatures } from '../../services/winget/system';
import type { FeatureEntry } from '../../types/winget.ts';

/**
 * 实验功能列表（表格）
 */
export const FeaturesTab: React.FC = () => {
  const { data, loading, refresh } = useFetchData<FeatureEntry[]>(
    getFeatures,
    [],
  );

  useEffect(() => {
    void refresh();
  }, []);
  const columns: TableProps<FeatureEntry>['columns'] = [
    {
      title: '功能',
      dataIndex: 'feature',
      sorter: (a, b) =>
        (a.feature || '').localeCompare(b.feature || ''),
    },
    {
      title: '状态',
      dataIndex: 'status',
      sorter: (a, b) =>
        (a.status || '').localeCompare(b.status || ''),
    },
    {
      title: '属性',
      dataIndex: 'property',
      sorter: (a, b) =>
        (a.property || '').localeCompare(b.property || ''),
    },
    {
      title: '链接',
      dataIndex: 'link',
      render: (v: string | null | undefined) =>
        v ? (
          <a href={v} target="_blank" rel="noreferrer">
            {v}
          </a>
        ) : (
          ''
        ),
      sorter: (a, b) => (a.link || '').localeCompare(b.link || ''),
    },
  ];
  return (
    <Table
      rowKey={(r) => r.feature}
      dataSource={data}
      loading={loading}
      columns={columns}
      pagination={false}
    />
  );
};
