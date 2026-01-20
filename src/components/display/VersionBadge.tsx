import { Tag } from 'antd';
import React from 'react';

/**
 * 版本徽标组件属性
 * @param version - 版本号文本
 * @param type - 徽标类型：'current' (当前安装), 'latest' (最新可用), 'upgrade' (可更新)
 * @param color - 自定义颜色
 */
interface VersionBadgeProps {
  version: string;
  type?: 'current' | 'latest' | 'upgrade';
  color?: string;
}

/**
 * 统一的版本号显示徽标
 * 为不同类型的版本号提供一致的视觉样式
 */
export const VersionBadge: React.FC<VersionBadgeProps> = ({
  version,
  type = 'current',
  color,
}) => {
  function getColor() {
    if (color) return color;
    switch (type) {
      case 'upgrade':
        return 'green';
      case 'latest':
        return 'blue';
      default:
        return 'default';
    }
  }

  if (!version || version === '-') {
    return <span>-</span>;
  }

  return (
    <Tag color={getColor()} style={{ borderRadius: '4px', margin: 0 }}>
      {version}
    </Tag>
  );
};
