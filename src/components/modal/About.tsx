import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Button, Divider, Input, Modal, message, Space } from 'antd';
import React, { useState } from 'react';
import { SOFT_INFO } from '../../constants/env.ts';
import { issuesLink, SOFT_URL } from '../../constants/link.ts';
import {
  EMAIL,
  QQ_GROUP,
  QQ_GROUP_LINK,
  SOFT_NAME,
} from '../../constants/soft.ts';

const { TextArea } = Input;

export const About: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [appInfo, setAppInfo] = useState<string>('');

  return (
    <>
      {contextHolder}
      <Space orientation="vertical" align="center" style={{ width: '100%' }}>
        <div style={{ fontSize: 'x-large' }}>
          <b>{SOFT_NAME}</b>
        </div>

        <Space separator={<Divider orientation="vertical" />}>
          <a
            onClick={() => {
              void openUrl(SOFT_URL);
            }}
          >
            官网
          </a>
          <a
            onClick={() => {
              void openUrl(issuesLink);
            }}
          >
            反馈问题
          </a>
          <a
            onClick={async () => {
              const info = {
                ...SOFT_INFO,
              };
              setAppInfo(JSON.stringify(info, null, 2));

              setIsModalOpen(true);
            }}
          >
            软件信息
          </a>
        </Space>

        <Space separator={<Divider orientation="vertical" />}>
          <div>
            客服邮箱:{' '}
            <a
              onClick={() => {
                void openUrl(`mailto:${EMAIL}`);
              }}
            >
              {EMAIL}
            </a>
          </div>
          <div>
            QQ群:{' '}
            <a
              onClick={() => {
                void openUrl(QQ_GROUP_LINK);
              }}
            >
              {QQ_GROUP}
            </a>
          </div>
        </Space>
      </Space>

      <Modal
        title="软件信息"
        centered={true}
        open={isModalOpen}
        maskClosable={false}
        onCancel={() => {
          setIsModalOpen(false);
        }}
        footer={[
          <Button
            key="copy"
            type="primary"
            style={{ width: '100%' }}
            onClick={async () => {
              await writeText(appInfo);
              messageApi.success('复制成功');
            }}
          >
            复制
          </Button>,
        ]}
      >
        <TextArea value={appInfo} autoSize readOnly />
      </Modal>
    </>
  );
};
