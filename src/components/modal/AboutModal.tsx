import { Modal, Space } from 'antd';
import React from 'react';
import { SOFT_INFO } from '../../constants/env.ts';
import { About } from './About.tsx';

interface AboutModalProps {
  open: boolean;
  onCancel: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  open: isOpen,
  onCancel,
}) => {
  return (
    <Modal
      title="关于"
      open={isOpen}
      footer={[
        <Space key="checkUpdate">
          <span>当前版本:{SOFT_INFO?.appVersion || '未知'}</span>
        </Space>,
      ]}
      onCancel={onCancel}
    >
      <About />
    </Modal>
  );
};
