import { Checkbox, Modal, Space } from 'antd';
import React, {
  type Dispatch,
  type SetStateAction,
  useImperativeHandle,
  useState,
} from 'react';
import { useUninstallAction } from '../../hooks/winget/action/useUninstallAction.ts';
import { DEFAULT_UNINSTALL_FLAGS } from '../../services/winget/constants';
import type { WingetPackage } from '../../types/winget.ts';
import {
  buildWingetFlags,
  handleModalCancel,
  handleModalOk,
} from '../../utils/modalUtils';
import { CommandDisplay } from '../display/CommandDisplay';
import { LogTerminal } from '../display/LogTerminal';
import { CustomFlagsInput } from '../input/CustomFlagsInput';
import { ModalActionFooter } from './ModalActionFooter.tsx';

export interface UninstallModalRef {
  handleUninstallOne: (r: {
    id: string;
    name: string;
    source?: string | null;
  }) => void;
  handleUninstallSelected: () => Promise<void>;
  selectedInstalledIds: string[];
  setSelectedInstalledIds: Dispatch<SetStateAction<string[]>>;
  uninstalling: boolean;
}

/**
 * 卸载确认与日志展示弹窗
 */
export const UninstallModal = React.forwardRef<
  UninstallModalRef,
  {
    installed: WingetPackage[];
    refreshAll: () => Promise<unknown>;
    selectedIds?: string[];
    setSelectedIds?: Dispatch<SetStateAction<string[]>>;
  }
>(({ installed, refreshAll, selectedIds, setSelectedIds }, ref) => {
  const {
    uninstallModalOpen,
    setUninstallModalOpen,
    uninstallTarget,
    execRunning,
    logBoxRef,
    logScrollRef,
    handleUninstallOne,
    startUninstallExecution,
    handleStopUninstall,
    selectedInstalledIds,
    setSelectedInstalledIds,
    handleUninstallSelected,
    uninstalling,
  } = useUninstallAction(installed, refreshAll, selectedIds, setSelectedIds);

  useImperativeHandle(ref, () => ({
    handleUninstallOne,
    handleUninstallSelected,
    selectedInstalledIds,
    setSelectedInstalledIds,
    uninstalling,
  }));

  // 用户要求不要默认静默卸载
  const [isSilent, setIsSilent] = useState(false);
  const [isForce, setIsForce] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [customFlags, setCustomFlags] = useState('');

  const getFlags = () => {
    return buildWingetFlags(DEFAULT_UNINSTALL_FLAGS, {
      isSilent,
      isForce,
      isInteractive,
      customFlags,
    });
  };

  const getCommand = () => {
    if (!uninstallTarget) return '';
    const base = `winget uninstall --id ${uninstallTarget.id}`;
    return `${base} ${getFlags().join(' ')}`;
  };

  const handleOk = () => {
    handleModalOk(false, false, logBoxRef, startUninstallExecution, getFlags);
  };

  const onCancel = () => setUninstallModalOpen(false);

  return (
    <Modal
      title={`卸载软件: ${uninstallTarget?.name || ''}`}
      open={uninstallModalOpen}
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
            静默卸载 (--silent)
          </Checkbox>
          <Checkbox
            checked={isForce}
            disabled={execRunning}
            onChange={(e) => setIsForce(e.target.checked)}
          >
            强制卸载 (--force)
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
          title="卸载日志"
        />

        <ModalActionFooter
          execRunning={execRunning}
          onOk={handleOk}
          onStop={handleStopUninstall}
          onCancel={() => handleModalCancel(execRunning, onCancel)}
          okText="立即卸载"
        />
      </Space>
    </Modal>
  );
});
