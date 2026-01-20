/**
 * 从 URL 中提取主域名
 * 用于 icon.horse 等服务获取图标
 * @param url - 原始 URL 字符串
 * @returns 提取出的域名字符串或 null
 */
export function getDomainFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    // 移除 www. 前缀
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch (_e) {
    // 如果不是合法的 URL，尝试简单的正则提取
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^/:\n?]+)/i);
    return match ? match[1].toLowerCase() : null;
  }
}
