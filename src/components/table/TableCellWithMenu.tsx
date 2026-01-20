import { Dropdown, Flex } from 'antd';
import React from 'react';
import type { WingetPackage } from '../../types/winget.ts';

/**
 * 表格单元格右键菜单组件属性
 * @param value - 单元格显示的值
 * @param record - 当前行的数据对象
 * @param onDetail - 点击“查看详细”的回调
 * @param onUpgrade - 点击“更新”的回调
 * @param onDownload - 点击“下载”的回调
 * @param onUninstall - 点击“卸载”的回调
 * @param prefix - 显示在值前面的内容（如图标）
 */
interface TableCellWithMenuProps {
  value: React.ReactNode;
  record: WingetPackage;
  onDetail?: (r: WingetPackage) => void;
  onUpgrade?: (r: WingetPackage) => void;
  onDownload?: (r: WingetPackage) => void;
  onUninstall?: (r: WingetPackage) => void;
  onHide?: (r: WingetPackage) => void;
  prefix?: React.ReactNode;
}

/**
 * 支持右键菜单的表格单元格
 * 为表格中的每一项提供快捷操作菜单
 */
export const TableCellWithMenu: React.FC<TableCellWithMenuProps> = ({
  value,
  record,
  onDetail,
  onUpgrade,
  onDownload,
  onUninstall,
  onHide,
  prefix,
}) => {
  const items = [
    ...(onDetail ? [{ key: 'detail', label: '查看详细' }] : []),
    ...(onUpgrade ? [{ key: 'upgrade', label: '更新' }] : []),
    ...(onHide ? [{ key: 'hide', label: '隐藏' }] : []),
    ...(onDownload ? [{ key: 'download', label: '下载安装程序' }] : []),
    ...(onUninstall ? [{ key: 'uninstall', label: '卸载该程序' }] : []),
  ];

  return (
    <Dropdown
      trigger={['contextMenu']}
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === 'detail' && onDetail) onDetail(record);
          if (key === 'upgrade' && onUpgrade) onUpgrade(record);
          if (key === 'hide' && onHide) onHide(record);
          if (key === 'download' && onDownload) onDownload(record);
          if (key === 'uninstall' && onUninstall) onUninstall(record);
        },
      }}
    >
      <Flex gap="small" justify="flex-start" align="center">
        {prefix}
        <span>{value ?? ''}</span>
      </Flex>
    </Dropdown>
  );
};
