import { Checkbox, Modal, Space } from 'antd';
import React, {
  type Dispatch,
  type SetStateAction,
  useImperativeHandle,
  useState,
} from 'react';
import { useUpgradeAction } from '../../hooks/winget/action/useUpgradeAction.ts';
import { DEFAULT_EXEC_FLAGS } from '../../services/winget/constants';
import { useConfigSync } from '../../sync/configSync.ts';
import type { WingetPackage } from '../../types/winget';
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

export interface UpgradeModalRef {
  handleUpgradeOne: (r: WingetPackage) => void;
  handleUpgradeSelected: (targets: WingetPackage[]) => void;
  selectedUpgradeIds: string[];
  setSelectedUpgradeIds: Dispatch<SetStateAction<string[]>>;
}

/**
 * 更新确认与日志展示弹窗
 */
export const UpgradeModal = React.forwardRef<
  UpgradeModalRef,
  {
    setUpgrades: Dispatch<SetStateAction<WingetPackage[]>>;
    selectedIds?: string[];
    setSelectedIds?: Dispatch<SetStateAction<string[]>>;
  }
>(({ setUpgrades, selectedIds, setSelectedIds }, ref) => {
  const {
    confirmUpgradeOpen,
    setConfirmUpgradeOpen,
    confirmTarget,
    confirmTargets,
    execRunning,
    logBoxRef,
    logScrollRef,
    handleUpgradeSelected,
    handleUpgradeOne,
    startUpgradeExecution,
    handleStopUpgrade,
    selectedUpgradeIds,
    setSelectedUpgradeIds,
  } = useUpgradeAction(setUpgrades, selectedIds, setSelectedIds);

  useImperativeHandle(ref, () => ({
    handleUpgradeOne,
    handleUpgradeSelected,
    selectedUpgradeIds,
    setSelectedUpgradeIds,
  }));
  const { data: config } = useConfigSync();
  const { useProxy, ignoreHash } = config;

  const [isSilent, setIsSilent] = useState(true);
  const [isForce, setIsForce] = useState(true);
  const [isInteractive, setIsInteractive] = useState(false);
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [customFlags, setCustomFlags] = useState('');

  const targets = confirmTargets || (confirmTarget ? [confirmTarget] : []);

  // 默认标志，排除掉我们手动控制的
  const baseFlags = DEFAULT_EXEC_FLAGS.filter(
    (f) =>
      f !== '--silent' &&
      f !== '--force' &&
      f !== '--include-unknown' &&
      f !== '--disable-interactivity' &&
      f !== '--interactive',
  );

  const getFlags = () => {
    return buildWingetFlags(baseFlags, {
      isSilent,
      isForce,
      isInteractive,
      includeUnknown,
      ignoreHash,
      useProxy,
      proxyUrl: `http://${config.proxyHost}:${config.proxyPort}`,
      customFlags,
    });
  };

  const getCommand = () => {
    const flags = getFlags().join(' ');
    if (targets.length > 0) {
      return targets
        .map((t) => `winget upgrade --id ${t.id} ${flags}`)
        .join('\n');
    }
    return '';
  };

  const handleOk = () => {
    handleModalOk(
      useProxy,
      ignoreHash,
      logBoxRef,
      startUpgradeExecution,
      getFlags,
    );
  };

  const onCancel = () => setConfirmUpgradeOpen(false);

  const title =
    targets.length > 1
      ? `批量更新软件 (${targets.length} 项)`
      : `更新软件: ${targets[0]?.name || ''}`;

  return (
    <Modal
      mask={{ enabled: true, blur: false }}
      centered={true}
      title={title}
      open={confirmUpgradeOpen}
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
            静默更新 (--silent)
          </Checkbox>
          <Checkbox
            checked={isForce}
            disabled={execRunning}
            onChange={(e) => setIsForce(e.target.checked)}
          >
            强制更新 (--force)
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
            交互式更新 (--interactive)
          </Checkbox>
          <Checkbox
            checked={includeUnknown}
            disabled={execRunning}
            onChange={(e) => setIncludeUnknown(e.target.checked)}
          >
            包含未知版本 (--include-unknown)
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
          title="操作日志"
        />

        <ModalActionFooter
          execRunning={execRunning}
          onOk={handleOk}
          onStop={handleStopUpgrade}
          onCancel={() => handleModalCancel(execRunning, onCancel)}
          okText="立即更新"
        />
      </Space>
    </Modal>
  );
});
