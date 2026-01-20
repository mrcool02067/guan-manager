import Icon from '@ant-design/icons';
import { Tooltip } from 'antd';

/**
 * 模拟 Windows 10/11 原生 UAC 盾牌图标 (四象限设计)
 */
const UACShieldSvg = () => (
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    role="img"
    aria-label="管理员权限提示"
  >
    <title>管理员权限提示</title>
    <path
      fill="#555"
      d="M8 0L1.5 2.5v6c0 4 3 6.5 6.5 7.5 3.5-1 6.5-3.5 6.5-7.5v-6L8 0z"
    />
    <path fill="#0078d7" d="M8 1.2L2.5 3.3v4.7H8V1.2z" />
    <path fill="#ffb900" d="M8 1.2v6.8h5.5V3.3L8 1.2z" />
    <path fill="#ffb900" d="M2.5 8h5.5v6.5c-2.5-.8-4.5-2.8-5.5-5.5V8z" />
    <path fill="#0078d7" d="M8 8h5.5v1c0 2.7-2 4.7-5.5 5.5V8z" />
  </svg>
);

export const UACShieldIcon = (props: any) => (
  <Tooltip title="此功能需要管理员权限">
    <Icon component={UACShieldSvg} {...props} />
  </Tooltip>
);
