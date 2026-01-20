import { Button, Form, message, Segmented, Space, Tag, Typography } from 'antd';
import React from 'react';
import { ThemeEnum } from '../../enums/ThemeEnum.ts';
import { useConfigSync } from '../../sync/configSync.ts';
import { syncValuesConfig } from '../../utils/formUtils.ts';

export const GeneralForm: React.FC = () => {
  const { data: config, sync: syncConfig } = useConfigSync();
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <Form
      disabled={false}
      initialValues={config}
      onValuesChange={syncValuesConfig}
    >
      <Form.Item name="themeMode" label="主题模式">
        <Segmented options={Object.values(ThemeEnum)} />
      </Form.Item>

      <Form.Item label="已隐藏的更新项">
        {contextHolder}
        {(!config.hideUpdateList || config.hideUpdateList.length === 0) ? (
          <Typography.Text type="secondary">
            暂无已隐藏的更新项
          </Typography.Text>
        ) : (
          <Space wrap>
            <Button
              type="link"
              size="small"
              onClick={async () => {
                try {
                  await syncConfig('hideUpdateList', []);
                  messageApi.success('已显示所有更新项');
                } catch (error) {
                  console.error('清除隐藏失败:', error);
                  messageApi.error('操作失败');
                }
              }}
            >
              恢复全部
            </Button>
            {config.hideUpdateList.map((item) => (
              <Tag
                key={item.id}
                closable
                onClose={async () => {
                  try {
                    const newList = config.hideUpdateList.filter(
                      (i) => i.id !== item.id,
                    );
                    await syncConfig('hideUpdateList', newList);
                    messageApi.success(`已恢复: ${item.name}`);
                  } catch (error) {
                    console.error('取消隐藏失败:', error);
                    messageApi.error('操作失败');
                  }
                }}
              >
                {item.name}
              </Tag>
            ))}
          </Space>
        )}
      </Form.Item>
    </Form>
  );
};
