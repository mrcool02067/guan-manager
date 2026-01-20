import { Button, Space } from 'antd';
import React from 'react';

interface ModalActionFooterProps {
  /** 是否正在执行中 */
  execRunning: boolean;
  /** 开始执行的回调 */
  onOk: () => void;
  /** 终止执行的回调 */
  onStop: () => void;
  /** 取消/关闭的回调 */
  onCancel: () => void;
  /** 确认按钮的文本，默认为 "开始执行" */
  okText?: string;
  /** 终止按钮的文本，默认为 "终止" */
  stopText?: string;
  /** 取消按钮的文本，默认为 "取消" */
  cancelText?: string;
  /** 确认按钮是否为危险状态 */
  dangerOk?: boolean;
}

/**
 * 模态框底部操作栏组件
 * 统一处理：执行中显示终止按钮，未执行显示取消和确认按钮
 */
export const ModalActionFooter: React.FC<ModalActionFooterProps> = ({
  execRunning,
  onOk,
  onStop,
  onCancel,
  okText = '开始执行',
  stopText = '终止',
  cancelText = '取消',
  dangerOk = false,
}) => {
  return (
    <div style={{ textAlign: 'right', marginTop: 16 }}>
      <Space>
        {execRunning ? (
          <Button danger onClick={onStop}>
            {stopText}
          </Button>
        ) : (
          <>
            <Button onClick={onCancel}>{cancelText}</Button>
            <Button type="primary" danger={dangerOk} onClick={onOk}>
              {okText}
            </Button>
          </>
        )}
      </Space>
    </div>
  );
};
