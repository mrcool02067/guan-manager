import { Checkbox, Modal, Space } from 'antd';
import React, { useImperativeHandle, useState } from 'react';
import { useInstallAction } from '../../hooks/winget/action/useInstallAction.ts';
import { DEFAULT_EXEC_FLAGS } from '../../services/winget/constants';
import { useConfigSync } from '../../sync/configSync.ts';
import {
  buildWingetFlags,
  handleModalCancel,
  handleModalOk,
} from '../../utils/modalUtils';
import { CommandDisplay } from '../display/CommandDisplay';
import { LogTerminal } from '../display/LogTerminal';
import { CustomFlagsInput } from '../input/CustomFlagsInput';
import { HashOverrideCheckbox } from '../input/HashOverrideCheckbox';
import { ProxyConfigCheckbox } from '../input/ProxyConfigCheckbox';
import { ModalActionFooter } from './ModalActionFooter.tsx';

export interface InstallModalRef {
  handleInstallOne: (r: { id: string; name: string }) => void;
}

/**
 * 安装确认与日志展示弹窗
 */
export const InstallModal = React.forwardRef<InstallModalRef, Record<never, never>>(
  (_, ref) => {
  const {
    installModalOpen,
    setInstallModalOpen,
    installTarget,
    execRunning,
    logBoxRef,
    logScrollRef,
    handleInstallOne,
    startInstallExecution,
    handleStopInstall,
  } = useInstallAction();

  useImperativeHandle(ref, () => ({
    handleInstallOne,
  }));

  const { data: config } = useConfigSync();
  const { useProxy, ignoreHash } = config;

  const [isSilent, setIsSilent] = useState(true);
  const [isForce, setIsForce] = useState(true);
  const [isInteractive, setIsInteractive] = useState(false);
  const [customFlags, setCustomFlags] = useState('');

  // 默认标志，排除掉我们手动控制的
  const baseFlags = DEFAULT_EXEC_FLAGS.filter(
    (f) =>
      f !== '--silent' &&
      f !== '--force' &&
      f !== '--disable-interactivity' &&
      f !== '--interactive',
  );

  const getFlags = () => {
    return buildWingetFlags(baseFlags, {
      isSilent,
      isForce,
      isInteractive,
      ignoreHash,
      useProxy,
      proxyUrl: `http://${config.proxyHost}:${config.proxyPort}`,
      customFlags,
    });
  };

  const getCommand = () => {
    if (!installTarget) return '';
    const base = `winget install --id ${installTarget.id}`;
    return `${base} ${getFlags().join(' ')}`;
  };

  const handleOk = () => {
    handleModalOk(
      useProxy,
      ignoreHash,
      logBoxRef,
      startInstallExecution,
      getFlags,
    );
  };

  const onCancel = () => setInstallModalOpen(false);

  return (
    <Modal
      title={`安装软件: ${installTarget?.name || ''}`}
      open={installModalOpen}
      onCancel={() => handleModalCancel(execRunning, onCancel)}
      footer={null}
      width={720}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Space wrap>
          <Checkbox
            checked={isSilent}
            disabled={execRunning || isInteractive}
            onChange={(e) => setIsSilent(e.target.checked)}
          >
            静默安装 (--silent)
          </Checkbox>
          <Checkbox
            checked={isForce}
            disabled={execRunning}
            onChange={(e) => setIsForce(e.target.checked)}
          >
            强制安装 (--force)
          </Checkbox>
          <Checkbox
            checked={isInteractive}
            disabled={execRunning}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsInteractive(checked);
              if (checked) {
                setIsSilent(false);
              }
            }}
          >
            交互式安装 (--interactive)
          </Checkbox>
          <HashOverrideCheckbox disabled={execRunning} />
          <ProxyConfigCheckbox disabled={execRunning} />
        </Space>

        <CustomFlagsInput
          value={customFlags}
          onChange={setCustomFlags}
          disabled={execRunning}
        />

        <CommandDisplay command={getCommand()} />

        <LogTerminal
          logScrollRef={logScrollRef}
          logBoxRef={logBoxRef}
          title="安装日志"
        />

        <ModalActionFooter
          execRunning={execRunning}
          onOk={handleOk}
          onStop={handleStopInstall}
          onCancel={() => handleModalCancel(execRunning, onCancel)}
          okText="立即安装"
        />
      </Space>
    </Modal>
  );
  },
);
