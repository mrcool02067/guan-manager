import { Card, Typography } from 'antd';
import React from 'react';

/**
 * 日志终端组件属性
 * @param logScrollRef - 滚动容器的 ref，用于控制自动滚动
 * @param logBoxRef - 日志内容的容器 ref
 * @param title - 终端上方的标题文字
 * @param maxHeight - 最大高度
 * @param minHeight - 最小高度
 */
interface LogTerminalProps {
  logScrollRef: React.RefObject<HTMLDivElement | null>;
  logBoxRef: React.RefObject<HTMLDivElement | null>;
  title?: string;
  maxHeight?: number;
  minHeight?: number;
}

/**
 * 统一的日志输出终端组件
 * 模拟黑色背景的终端界面，用于展示 winget 命令执行的实时输出
 */
export const LogTerminal: React.FC<LogTerminalProps> = ({
  logScrollRef,
  logBoxRef,
  title = '实时输出：',
  maxHeight = 300,
  minHeight = 150,
}) => {
  return (
    <div>
      <Typography.Text strong>{title}</Typography.Text>
      <Card size="small" style={{ marginTop: 8, backgroundColor: '#000' }}>
        <div
          ref={logScrollRef}
          style={{
            maxHeight,
            minHeight,
            overflow: 'auto',
            color: '#fff',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '12px',
          }}
        >
          <div ref={logBoxRef} style={{ whiteSpace: 'pre-wrap' }} />
        </div>
      </Card>
    </div>
  );
};
