import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { Layout, Spin } from 'antd';
import { useEffect, useState } from 'react';
import AntdProvider from './AntdProvider.tsx';
import { initAll } from './init.ts';

const Root = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    initAll().then(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <Spin tip="加载中" size="large">
        <div style={{ height: '100vh' }}></div>
      </Spin>
    );
  }

  return (
    <AntdProvider>
      <Layout
        style={{
          padding: '8px',
        }}
      >
        <App />
      </Layout>
    </AntdProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Root />,
);
