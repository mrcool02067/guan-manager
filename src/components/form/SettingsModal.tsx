import { Modal } from 'antd';
import React from 'react';
import { Settings } from './Settings.tsx';

interface Props {
  open: boolean;
  onCancel: () => void;
}

export const SettingsModal: React.FC<Props> = ({ open, onCancel }) => {
  return (
    <Modal
      title="设置"
      open={open}
      centered={true}
      destroyOnHidden={true}
      maskClosable={true}
      onCancel={onCancel}
      footer={[]}
      width={1000}
    >
      <Settings />
    </Modal>
  );
};
