import { Space, Tabs, type TabsProps } from 'antd';
import React, { useState } from 'react';
import { GeneralForm } from './GeneralForm.tsx';
import { ProxyForm } from './ProxyForm.tsx';

export const Settings: React.FC = () => {
  const [activeKey, setActiveKey] = useState<string>('advancedOptions');

  const advanceTabItems: TabsProps['items'] = [
    {
      key: 'advancedOptions',
      label: '通用设置',
      children: <GeneralForm />,
    },
    {
      key: 'proxy',
      label: '网络代理',
      children: <ProxyForm />,
    },
  ];

  return (
    <Space orientation="vertical" style={{ width: '100%', height: '100%' }}>
      <Tabs
        activeKey={activeKey}
        tabPlacement="top"
        items={advanceTabItems}
        onChange={(key) => setActiveKey(key)}
        style={{ height: '100%' }}
      />
    </Space>
  );
};
