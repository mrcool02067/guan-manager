import { Card, Descriptions, Skeleton, Typography } from 'antd';
import React, { useEffect } from 'react';
import { useFetchData } from '../../hooks/winget/useFetchData.ts';
import {
  getHelpText,
  getInfo,
  getWingetVersion,
} from '../../services/winget/system';

/**
 * Winget 信息展示页
 */
export const InfoTab: React.FC = () => {
  async function fetchFn() {
    const [info, version, helpText] = await Promise.all([
      getInfo(),
      getWingetVersion(),
      getHelpText(),
    ]);
    return { info, version, helpText };
  }

  const { data, loading, refresh } = useFetchData(fetchFn, {
    info: '',
    version: '',
    helpText: '',
  });

  const { version, info, helpText } = data;

  useEffect(() => {
    void refresh();
  }, []);

  if (loading && !version) {
    return <Skeleton active />;
  }
  return (
    <>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="版本">{version}</Descriptions.Item>
      </Descriptions>
      <Card title="winget --info">
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {info}
        </Typography.Paragraph>
      </Card>
      <Card title="winget --help">
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {helpText}
        </Typography.Paragraph>
      </Card>
    </>
  );
};
