import { Flex, Form, Input, InputNumber, Space } from 'antd';
import React from 'react';
import { useConfigSync } from '../../sync/configSync.ts';
import { syncValuesConfig } from '../../utils/formUtils.ts';
import { ProxyConfigCheckbox } from '../input/ProxyConfigCheckbox.tsx';

export const ProxyForm: React.FC = () => {
  const { data: config } = useConfigSync();

  return (
    <Flex vertical gap="large">
      <ProxyConfigCheckbox disabled={false} />
      <Form
        disabled={!config.useProxy}
        initialValues={config}
        onValuesChange={syncValuesConfig}
      >
        <Space>
          <Form.Item label="代理地址" name="proxyHost" required={true}>
            <Input prefix="http://" />
          </Form.Item>
          <Form.Item label="代理端口" name="proxyPort" required={true}>
            <InputNumber min={0} step={1} />
          </Form.Item>
        </Space>
        <Space>
          <Form.Item label="用户名" name="proxyUsername">
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="proxyPassword">
            <Input.Password />
          </Form.Item>
        </Space>
      </Form>
    </Flex>
  );
};
