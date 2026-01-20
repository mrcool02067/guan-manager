import { Button, Table, Tag, Typography } from 'antd';
import React, { useEffect } from 'react';
import { useFetchData } from '../../hooks/winget/useFetchData.ts';
import { getSources } from '../../services/winget/system';
import type { SourceEntry } from '../../types/winget.ts';

/**
 * 软件源列表组件
 * 展示 winget 已配置的软件源信息
 */
export const SourcesTab: React.FC = () => {
  const { data, loading, refresh } = useFetchData<SourceEntry[]>(
    getSources,
    [],
  );

  useEffect(() => {
    void refresh();
  }, []);

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: SourceEntry, b: SourceEntry) =>
        (a.name || '').localeCompare(b.name || ''),
      render: (text: string) => (
        <Typography.Text strong>{text}</Typography.Text>
      ),
    },
    {
      title: '参数',
      dataIndex: 'arg',
      key: 'arg',
      render: (text: string) => (
        <Typography.Text copyable type="secondary" style={{ fontSize: '12px' }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: '显式',
      dataIndex: 'explicit',
      key: 'explicit',
      width: '15%',
      sorter: (a: SourceEntry, b: SourceEntry) =>
        (a.explicit || '').localeCompare(b.explicit || ''),
      render: (text: string) => (
        <Tag color={text === 'true' ? 'blue' : 'default'}>{text || '-'}</Tag>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: '16px', borderRadius: '8px' }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography.Text type="secondary">
          共管理 {data.length} 个软件源
        </Typography.Text>
        <Button type="primary" onClick={refresh} loading={loading}>
          刷新源列表
        </Button>
      </div>
      <Table
        rowKey="name"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="middle"
        bordered
      />
    </div>
  );
};
