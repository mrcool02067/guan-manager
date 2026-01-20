import { Typography } from 'antd';
import React from 'react';

/**
 * 文本链接转换组件属性
 * @param text - 需要转换的原始文本
 */
interface TextWithLinksProps {
  text: string;
}

/**
 * 自动识别链接的文本组件
 * 将纯文本中的 URL (http/https) 自动转换为可点击的超链接
 */
export const TextWithLinks: React.FC<TextWithLinksProps> = ({ text }) => {
  const urlRe = /https?:\/\/[^\s)]+/g;
  const lines = text.split(/\r?\n/);

  return (
    <div>
      {lines.map((line) => {
        const parts: (string | React.ReactNode)[] = [];
        let lastIndex = 0;
        for (const match of line.matchAll(urlRe)) {
          const url = match[0];
          const start = match.index ?? 0;
          if (start > lastIndex) parts.push(line.slice(lastIndex, start));
          parts.push(
            <a
              key={`${url}-${start}`}
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              {url}
            </a>,
          );
          lastIndex = start + url.length;
        }
        if (lastIndex < line.length) parts.push(line.slice(lastIndex));
        // 使用 line 内容的一部分和长度作为 key，比纯 index 更好
        const lineKey = `${line.slice(0, 20)}-${line.length}`;
        return (
          <Typography.Paragraph key={lineKey}>{parts}</Typography.Paragraph>
        );
      })}
    </div>
  );
};
