import { AppstoreOutlined, LoadingOutlined } from '@ant-design/icons';
import { Image } from 'antd';
import React, { useEffect, useState } from 'react';
import { getAppIcon, wingetFastDetail } from '../../services/winget/package';
import { getDomainFromUrl } from '../../utils/url.ts';

/**
 * 软件图标组件属性
 * @param id - 软件 ID (如 Microsoft.VisualStudioCode)
 * @param name - 软件名称
 * @param domain - 软件官网域名（可选，用于远程图标获取）
 * @param className - 自定义样式类名
 * @param size - 图标尺寸，默认为 32
 * @param forceRemote - 是否强制从远程获取图标（通常在搜索结果中使用）
 */
interface SoftwareIconProps {
  id: string;
  name?: string;
  domain?: string;
  className?: string;
  size?: number;
  forceRemote?: boolean;
}

/**
 * 智能软件图标组件
 * 支持从本地提取安装程序的图标，或根据域名从远程获取图标
 */
export const SoftwareIcon: React.FC<SoftwareIconProps> = ({
  id,
  name,
  domain,
  className,
  size = 32,
  forceRemote = false,
}) => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 获取图标函数
  async function fetchIcon(isMounted: () => boolean) {
    setLoading(true);
    setError(false);
    setIconUrl(null); // 重置图标 URL，防止在加载新图标时显示旧图标

    // 情况 A：强制在线模式（仅用于在线搜索）
    if (forceRemote) {
      try {
        let targetDomain = domain;

        // 如果没有提供域名，则尝试从 winget 获取软件详情中的主页
        if (!targetDomain) {
          const detail = await wingetFastDetail(id);
          const homepage = detail.homepage || '';
          targetDomain = getDomainFromUrl(homepage) || '';
        }

        if (targetDomain) {
          const remoteUrl = `https://favicon.im/${encodeURIComponent(targetDomain)}?larger=true`;
          // 仅尝试远程验证，失败即报错，绝不尝试本地
          const isValid = await new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = remoteUrl;
          });

          if (isValid && isMounted()) {
            setIconUrl(remoteUrl);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error(`Remote icon fetch failed for ${id}:`, e);
      }
    } else {
      // 情况 B：本地模式（仅用于已安装/可更新列表）
      // 避免过多的请求集中发送（保持原始逻辑）
      const delay = Math.random() * 300;
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (!isMounted()) return;

      try {
        // 仅尝试从本地提取，失败即报错，绝不尝试远程
        const url = await getAppIcon(id, name);
        if (isMounted()) {
          if (url.length > 0) {
            setIconUrl(url);
            setLoading(false);
            return;
          }
          throw new Error('Local icon fetch returned empty result');
        }
      } catch (e) {
        if (isMounted()) {
          console.warn(`Local icon fetch failed for ${id}:`, e);
        }
      }
    }

    if (isMounted()) {
      setError(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    function isMounted() {
      return mounted;
    }
    void fetchIcon(isMounted);
    return () => {
      mounted = false;
    };
  }, [id, name, domain, forceRemote]);

  const iconStyle = {
    width: size,
    height: size,
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    flexShrink: 0,
  };

  if (loading) {
    return (
      <div style={iconStyle} className={className}>
        <LoadingOutlined style={{ fontSize: size / 2, color: '#1890ff' }} />
      </div>
    );
  }

  if (error || !iconUrl) {
    return (
      <div style={iconStyle} className={className}>
        <AppstoreOutlined style={{ fontSize: size / 2, color: '#bfbfbf' }} />
      </div>
    );
  }

  return (
    <Image
      src={iconUrl}
      alt={name || id}
      fallback=""
      preview={false}
      width={size}
      height={size}
      style={{ borderRadius: '4px', objectFit: 'contain' }}
      className={className}
      onError={() => setError(true)}
    />
  );
};
