import { Collapse, Input, Typography } from 'antd';
import React from 'react';

/**
 * 命令显示组件属性
 * @param command - 要显示的命令文本
 * @param maxRows - TextArea 最大显示行数，超出后滚动
 * @param defaultExpanded - 默认是否展开折叠面板
 */
interface CommandDisplayProps {
  command: string;
  maxRows?: number;
  defaultExpanded?: boolean;
}

/**
 * 统一的命令显示组件
 * 采用可折叠面板包裹只读的 TextArea，支持自动高度和等宽字体显示
 */
export const CommandDisplay: React.FC<CommandDisplayProps> = ({
  command,
  maxRows = 6,
  defaultExpanded = false,
}) => {
  return (
    <Collapse
      ghost
      size="small"
      defaultActiveKey={defaultExpanded ? ['command'] : []}
      items={[
        {
          key: 'command',
          label: (
            <Typography.Text strong type="secondary">
              即将执行的命令 (点击展开/收起)
            </Typography.Text>
          ),
          children: (
            <Input.TextArea
              readOnly
              value={command}
              autoSize={{ minRows: 2, maxRows }}
              style={{
                fontFamily:
                  'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                fontSize: 'smaller',
              }}
            />
          ),
        },
      ]}
    />
  );
};
