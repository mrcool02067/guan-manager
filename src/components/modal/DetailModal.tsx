import { Descriptions, Modal, Space, Spin, Tag, Typography } from 'antd';
import React, { useImperativeHandle } from 'react';
import { useDetailAction } from '../../hooks/winget/action/useDetailAction.ts';
import { buildDetailView, parseKeyValues } from '../../utils/detail.ts';
import { TextWithLinks } from '../display/TextWithLinks.tsx';

export interface DetailModalRef {
  openDetailByQuery: (id: string, name: string) => Promise<void>;
}

/**
 * 包详情弹窗
 */
export const DetailModal = React.forwardRef<
  DetailModalRef,
  { setError?: (err: string) => void }
>(({ setError }, ref) => {
  const {
    showDetailOpen,
    setShowDetailOpen,
    showDetail,
    showDetailLoading,
    externalId,
    externalName,
    openDetailByQuery,
  } = useDetailAction(setError || (() => {}));

  useImperativeHandle(ref, () => ({
    openDetailByQuery,
  }));

  const onClose = () => setShowDetailOpen(false);

  return (
    <Modal
      centered={true}
      title={externalName ? `软件详情 - ${externalName}` : '软件详情'}
      open={showDetailOpen}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {showDetailLoading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}
      {!showDetailLoading &&
        showDetail &&
        (() => {
          const kv = parseKeyValues(showDetail.raw_details || '');
          const view = buildDetailView(showDetail, kv);
          // 如果详情中没有名称，使用外部传入的名称
          const displayName = view.name || externalName;
          // 如果详情中没有 ID，使用外部传入的 ID
          const displayId = view.id || externalId;

          return (
            <Descriptions bordered size="small" column={1}>
              {displayName && (
                <Descriptions.Item label="名称">
                  {displayName}
                </Descriptions.Item>
              )}
              {displayId && (
                <Descriptions.Item label="ID">{displayId}</Descriptions.Item>
              )}
              {(view.installed_version || view.version) && (
                <Descriptions.Item label="版本">
                  {view.installed_version || view.version}
                </Descriptions.Item>
              )}
              {view.installed_version &&
                view.available_version &&
                view.available_version !== view.installed_version && (
                  <Descriptions.Item label="可更新至">
                    {view.available_version}
                  </Descriptions.Item>
                )}
              {view.description && (
                <Descriptions.Item label="简介">
                  <TextWithLinks text={view.description ?? ''} />
                </Descriptions.Item>
              )}
              {view.release_notes && (
                <Descriptions.Item label="发布说明">
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                    {view.release_notes}
                  </Typography.Paragraph>
                </Descriptions.Item>
              )}
              {view.docs && view.docs.length > 0 && (
                <Descriptions.Item label="文档">
                  <Space
                    orientation="vertical"
                    size={0}
                    style={{ width: '100%' }}
                  >
                    {view.docs.map((doc) => (
                      <a
                        key={doc.url}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.title || doc.url}
                      </a>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              {view.source && (
                <Descriptions.Item label="源">{view.source}</Descriptions.Item>
              )}
              {view.publisher && (
                <Descriptions.Item label="发布者">
                  {view.publisher}
                </Descriptions.Item>
              )}
              {view.author && (
                <Descriptions.Item label="作者">
                  {view.author}
                </Descriptions.Item>
              )}
              {view.moniker && (
                <Descriptions.Item label="绰号">
                  {view.moniker}
                </Descriptions.Item>
              )}
              {view.tags && view.tags.length > 0 && (
                <Descriptions.Item label="标记">
                  <Space wrap>
                    {view.tags?.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              {view.dependencies && view.dependencies.length > 0 && (
                <Descriptions.Item label="依赖项">
                  <Space wrap>
                    {view.dependencies?.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              {view.installer_type && (
                <Descriptions.Item label="安装程序类型">
                  {view.installer_type}
                </Descriptions.Item>
              )}
              {view.installer_locale && (
                <Descriptions.Item label="安装程序语言">
                  {view.installer_locale}
                </Descriptions.Item>
              )}
              {view.architecture && (
                <Descriptions.Item label="架构">
                  {view.architecture}
                </Descriptions.Item>
              )}
              {view.size && (
                <Descriptions.Item label="大小">{view.size}</Descriptions.Item>
              )}
              {view.download_url && (
                <Descriptions.Item label="下载地址">
                  <a href={view.download_url} target="_blank" rel="noreferrer">
                    {view.download_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.installer_url &&
                view.installer_url !== view.download_url && (
                  <Descriptions.Item label="安装程序">
                    <a
                      href={view.installer_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {view.installer_url}
                    </a>
                  </Descriptions.Item>
                )}
              {view.sha256 && (
                <Descriptions.Item label="SHA256">
                  {view.sha256}
                </Descriptions.Item>
              )}
              {typeof view.offline === 'boolean' && (
                <Descriptions.Item label="脱机分发">
                  {view.offline ? (
                    <Tag color="green">支持</Tag>
                  ) : (
                    <Tag>不支持</Tag>
                  )}
                </Descriptions.Item>
              )}
              {view.release_date && (
                <Descriptions.Item label="发布日期">
                  {view.release_date}
                </Descriptions.Item>
              )}
              {view.homepage && (
                <Descriptions.Item label="主页">
                  <a href={view.homepage} target="_blank" rel="noreferrer">
                    {view.homepage}
                  </a>
                </Descriptions.Item>
              )}
              {view.server_url && (
                <Descriptions.Item label="发布服务器">
                  <a href={view.server_url} target="_blank" rel="noreferrer">
                    {view.server_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.server_support_url && (
                <Descriptions.Item label="发布服务器支持">
                  <a
                    href={view.server_support_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {view.server_support_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.license && (
                <Descriptions.Item label="许可证">
                  {view.license}
                </Descriptions.Item>
              )}
              {view.license_url && (
                <Descriptions.Item label="许可证网址">
                  <a href={view.license_url} target="_blank" rel="noreferrer">
                    {view.license_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.privacy_url && (
                <Descriptions.Item label="隐私网址">
                  <a href={view.privacy_url} target="_blank" rel="noreferrer">
                    {view.privacy_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.copyright && (
                <Descriptions.Item label="版权所有">
                  {view.copyright}
                </Descriptions.Item>
              )}
              {view.copyright_url && (
                <Descriptions.Item label="版权网址">
                  <a href={view.copyright_url} target="_blank" rel="noreferrer">
                    {view.copyright_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.manifest && (
                <Descriptions.Item label="清单">
                  <a href={view.manifest} target="_blank" rel="noreferrer">
                    {view.manifest}
                  </a>
                </Descriptions.Item>
              )}
              {view.purchase_url && (
                <Descriptions.Item label="购买">
                  <a href={view.purchase_url} target="_blank" rel="noreferrer">
                    {view.purchase_url}
                  </a>
                </Descriptions.Item>
              )}
              {view.release_notes_url && (
                <Descriptions.Item label="发行说明网址">
                  <a
                    href={view.release_notes_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {view.release_notes_url}
                  </a>
                </Descriptions.Item>
              )}
            </Descriptions>
          );
        })()}
    </Modal>
  );
});
