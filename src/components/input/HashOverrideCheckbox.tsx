import { Checkbox, Space, message } from 'antd';
import React, { useState } from 'react';
import {
  checkInstallerHashOverride,
  enableInstallerHashOverride,
} from '../../services/winget/system.ts';
import { useConfigSync } from '../../sync/configSync.ts';
import { UACShieldIcon } from '../icon/UACShieldIcon.tsx';

/**
 * 哈希校验覆盖勾选框组件属性
 * @param disabled - 是否禁用勾选
 */
interface HashOverrideCheckboxProps {
  disabled?: boolean;
}

/**
 * 带有 UAC 授权逻辑的忽略哈希校验勾选框
 */
export const HashOverrideCheckbox: React.FC<HashOverrideCheckboxProps> = ({
  disabled = false,
}) => {
  const { data: config, sync: syncConfig } = useConfigSync();
  const [loading, setLoading] = useState(false);

  return (
    <Checkbox
      checked={config.ignoreHash}
      disabled={disabled || loading}
      onChange={async (e) => {
        const checked = e.target.checked;
        if (checked) {
          setLoading(true);
          try {
            const isEnabled = await checkInstallerHashOverride();
            if (!isEnabled) {
              await enableInstallerHashOverride();
            }
            await syncConfig('ignoreHash', true);
          } catch (err) {
            console.error('Failed to enable hash override:', err);
            message.error('启用忽略哈希校验失败，可能已取消授权或发生错误');
          } finally {
            setLoading(false);
          }
        } else {
          await syncConfig('ignoreHash', false);
        }
      }}
    >
      <Space size="small">
        <UACShieldIcon />
        <span>
          {loading
            ? '正在开启忽略哈希...'
            : '忽略哈希校验 (--ignore-security-hash)'}
        </span>
      </Space>
    </Checkbox>
  );
};
