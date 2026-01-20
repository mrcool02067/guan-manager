import { Checkbox, Space, message } from 'antd';
import React, { useState } from 'react';
import {
  checkProxySettings,
  enableProxySettings,
} from '../../services/winget/system.ts';
import { useConfigSync } from '../../sync/configSync.ts';
import { UACShieldIcon } from '../icon/UACShieldIcon.tsx';

/**
 * 代理配置勾选框组件属性
 * @param checked - 是否勾选
 * @param onChange - 勾选状态变更的回调函数
 * @param disabled - 是否禁用勾选
 */
interface ProxyConfigCheckboxProps {
  disabled: boolean;
}

/**
 * 带有配置信息显示的代理勾选框
 * 自动从全局配置中获取代理主机和端口并显示在标签中
 */
export const ProxyConfigCheckbox: React.FC<ProxyConfigCheckboxProps> = ({
  disabled = false,
}) => {
  const { data: config, sync: syncConfig } = useConfigSync();
  const [loading, setLoading] = useState(false);

  return (
    <Checkbox
      checked={config.useProxy}
      disabled={disabled || loading}
      onChange={async (e) => {
        const checked = e.target.checked;
        if (checked) {
          setLoading(true);
          try {
            const isProxyEnabled = await checkProxySettings();
            if (!isProxyEnabled) {
              await enableProxySettings();
            }
            await syncConfig('useProxy', true);
          } catch (err) {
            console.error('Failed to enable proxy:', err);
            message.error('开启代理设置失败，可能已取消授权或发生错误');
          } finally {
            setLoading(false);
          }
        } else {
          syncConfig('useProxy', false);
        }
      }}
    >
      <Space size="small">
        <UACShieldIcon />
        <span>
          {loading
            ? '正在检查/开启代理...'
            : `使用代理 (--proxy http://${config.proxyHost}:${config.proxyPort})`}
        </span>
      </Space>
    </Checkbox>
  );
};
