import { Input, Typography } from 'antd';
import React from 'react';

/**
 * 自定义参数输入组件属性
 * @param value - 输入框的值
 * @param onChange - 值变更的回调函数
 * @param disabled - 是否禁用输入
 * @param placeholder - 输入框占位符
 * @param label - 输入框上方的提示文字
 */
interface CustomFlagsInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

/**
 * 统一的自定义命令行参数输入组件
 * 包含提示文字和带间距的输入框
 */
export const CustomFlagsInput: React.FC<CustomFlagsInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '例如: --location C:\\Path',
  label = '其他自定义参数 (空格分隔):',
}) => {
  return (
    <div>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Input
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ marginTop: 8 }}
      />
    </div>
  );
};
