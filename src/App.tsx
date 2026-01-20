import { openUrl } from '@tauri-apps/plugin-opener';
import { Alert, Badge, Space, Tabs, type TabsProps, Tooltip } from 'antd';
import React, { useState } from 'react';
import { SettingsModal } from './components/form/SettingsModal.tsx';
import { AboutModal } from './components/modal/AboutModal.tsx';
import { FeaturesTab } from './components/tab/FeaturesTab.tsx';
import { InfoTab } from './components/tab/InfoTab.tsx';
import { InstalledTab } from './components/tab/InstalledTab.tsx';
import { OnlineSearchTab } from './components/tab/OnlineSearchTab.tsx';
import { SourcesTab } from './components/tab/SourcesTab.tsx';
import { UpgradesTab } from './components/tab/UpgradesTab.tsx';
import { wikiLink } from './constants/link.ts';
import { DebugConst } from './debugConst.ts';
import { useListen } from './hooks/useListen.ts';
import { isWingetInstalled } from './init.ts';
import { useConfigSync } from './sync/configSync.ts';

/**
 * 应用根组件
 * 负责整体布局与各业务模块的整合
 */
const App: React.FC = () => {
  const { data: config } = useConfigSync();

  // 弹窗显隐状态
  const [isAboutModal, setIsAboutModal] = useState<boolean>(false);
  const [isSettingsModal, setIsSettingsModal] = useState<boolean>(false);

  // 布局与全局状态
  const [activeKey, setActiveKey] = useState<string>('upgrades');
  const [error, setError] = useState<string>('');
  const [upgradesCount, setUpgradesCount] = useState<number>(0);

  useListen({
    settings_emit: () => setIsSettingsModal(true),
    tutorial_emit: () => openUrl(wikiLink),
    about_emit: () => setIsAboutModal(true),
  });

  const tabItems: TabsProps['items'] = [
    {
      key: 'search',
      label: '在线搜索',
      children: <OnlineSearchTab setError={setError} />,
    },
    {
      key: 'upgrades',
      label: (
        <Badge
          count={upgradesCount}
          offset={[12, 0]}
          size="small"
          style={{ backgroundColor: '#52c41a' }}
        >
          可更新
        </Badge>
      ),
      children: (
        <UpgradesTab setError={setError} onCountChange={setUpgradesCount} />
      ),
    },
    {
      key: 'installed',
      label: '已安装',
      children: <InstalledTab setError={setError} />,
    },
    ...(DebugConst.IS_DEV
      ? [
          {
            key: 'sources',
            label: '来源',
            children: <SourcesTab />,
          },
          {
            key: 'features',
            label: '实验功能',
            children: <FeaturesTab />,
          },
          {
            key: 'info',
            label: '信息',
            children: <InfoTab />,
          },
        ]
      : []),
  ];

  return (
    <div style={{ position: 'relative' }}>
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {!isWingetInstalled ? (
        <Alert
          type="warning"
          showIcon
          title="未检测到 WinGet"
          description="请确保系统中已安装 WinGet 命令行工具。"
        />
      ) : (
        <div>
          <Tabs
            size="small"
            activeKey={activeKey}
            onChange={setActiveKey}
            items={tabItems}
            destroyOnHidden={false}
          />
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 16,
              zIndex: 1000,
              padding: '4px 12px',
              // backgroundColor: token.colorBgElevated,
              // borderRadius: token.borderRadiusLG,
              // backdropFilter: 'blur(8px)',
              // boxShadow: token.boxShadowSecondary,
              // border: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Tooltip
              title={
                config.useProxy
                  ? `当前代理：http://${config.proxyHost}:${config.proxyPort}`
                  : '未启用代理'
              }
            >
              <Space
                align="center"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsSettingsModal(true)}
              >
                <Badge
                  status={config.useProxy ? 'success' : 'default'}
                  text={config.useProxy ? '代理已开启' : '代理已关闭'}
                />
                {/*{config.useProxy && (*/}
                {/*  <Typography.Text type="secondary">*/}
                {/*    （--proxy http://{config.proxyHost}:{config.proxyPort}）*/}
                {/*  </Typography.Text>*/}
                {/*)}*/}
              </Space>
            </Tooltip>
          </div>
        </div>
      )}

      {/* 全局布局弹窗 */}
      <AboutModal open={isAboutModal} onCancel={() => setIsAboutModal(false)} />
      <SettingsModal
        open={isSettingsModal}
        onCancel={() => setIsSettingsModal(false)}
      />
    </div>
  );
};

export default App;
