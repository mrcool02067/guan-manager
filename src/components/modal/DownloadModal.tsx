import { Descriptions, Flex, Modal, Typography } from 'antd';
import React, { useImperativeHandle } from 'react';
import { useDownloadAction } from '../../hooks/winget/action/useDownloadAction.ts';
import { DEFAULT_DOWNLOAD_FLAGS } from '../../services/winget/constants';
import { useConfigSync } from '../../sync/configSync';
import type { WingetPackage } from '../../types/winget';
import {
  buildWingetFlags,
  handleModalCancel,
  handleModalOk,
} from '../../utils/modalUtils';
import { CommandDisplay } from '../display/CommandDisplay';
import { LogTerminal } from '../display/LogTerminal';
import { SoftwareIcon } from '../display/SoftwareIcon';
import { ProxyConfigCheckbox } from '../input/ProxyConfigCheckbox';
import { ModalActionFooter } from './ModalActionFooter';

export interface DownloadModalRef {
  handleDownloadInstaller: (r: WingetPackage) => Promise<void>;
}

/**
 * 下载安装程序弹窗
 */
export const DownloadModal = React.forwardRef<DownloadModalRef, Record<never, never>>(
  (_, ref) => {
  const {
    downloadModalOpen,
    setDownloadModalOpen,
    downloadTarget,
    downloadRunning,
    downloadDir,
    downloadLogBoxRef,
    downloadLogScrollRef,
    handleDownloadInstaller,
    startDownloadExecution,
    handleStopDownload,
  } = useDownloadAction();

  useImperativeHandle(ref, () => ({
    handleDownloadInstaller,
  }));

  const { data: config } = useConfigSync();
  const { useProxy } = config;

  const getCommand = () => {
    if (!downloadTarget || !downloadDir) return '';
    const flags = buildWingetFlags(DEFAULT_DOWNLOAD_FLAGS, {
      useProxy,
      proxyUrl: `http://${config.proxyHost}:${config.proxyPort}`,
    }).join(' ');
    return `winget download --id ${downloadTarget.id} --location "${downloadDir}" ${flags}`;
  };

  const handleOk = () => {
    handleModalOk(useProxy, false, downloadLogBoxRef, startDownloadExecution);
  };

  const onCancel = () => setDownloadModalOpen(false);

  return (
    <Modal
      title="下载安装程序"
      maskClosable={false}
      open={downloadModalOpen}
      onCancel={() => handleModalCancel(downloadRunning, onCancel)}
      footer={null}
      width={720}
    >
      {downloadTarget && (
        <Flex vertical gap="small">
          <Flex align="center" gap="small">
            <SoftwareIcon
              id={downloadTarget.id}
              name={downloadTarget.name}
              size={64}
            />
            <Flex vertical gap="small">
              <Typography.Text strong>{downloadTarget.name}</Typography.Text>
              <Typography.Text type="secondary">
                ID: {downloadTarget.id}
              </Typography.Text>
            </Flex>
          </Flex>

          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="下载目录">
              <Typography.Text copyable>{downloadDir}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="源">
              {downloadTarget.source || 'Winget'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <ProxyConfigCheckbox disabled={downloadRunning} />
          </div>
          <CommandDisplay command={getCommand()} />

          <LogTerminal
            logScrollRef={downloadLogScrollRef}
            logBoxRef={downloadLogBoxRef}
            title="下载日志"
          />

          <ModalActionFooter
            execRunning={downloadRunning}
            onOk={handleOk}
            onStop={handleStopDownload}
            onCancel={() => handleModalCancel(downloadRunning, onCancel)}
            okText="立即下载"
          />
        </Flex>
      )}
    </Modal>
  );
  },
);
