import React from 'react';
import { Typography, Space, Breadcrumb, Button, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    title: string;
    path?: string;
  }>;
  extra?: React.ReactNode;
  actions?: MenuProps['items'];
  showDivider?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  actions,
  showDivider = true,
}) => {
  return (
    <div className={`bg-white p-4 sm:p-6 ${showDivider ? 'border-b border-gray-200' : ''}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className=\"mb-4\">
          <Breadcrumb
            items={breadcrumbs.map((item, index) => ({
              title: item.path ? (
                <a href={item.path}>{item.title}</a>
              ) : (
                item.title
              ),
            }))}
          />
        </div>
      )}

      {/* Header Content */}
      <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4\">
        {/* Title and Subtitle */}
        <div className=\"min-w-0 flex-1\">
          <Title level={2} className=\"!mb-1 truncate\">
            {title}
          </Title>
          {subtitle && (
            <Text className=\"text-gray-600 block\">
              {subtitle}
            </Text>
          )}
        </div>

        {/* Actions */}
        <div className=\"flex items-center gap-2 flex-shrink-0\">
          {/* Desktop actions */}
          <div className=\"hidden sm:flex items-center gap-2\">
            {extra}
          </div>

          {/* Mobile actions dropdown */}
          {(extra || actions) && (
            <div className=\"sm:hidden\">
              <Dropdown
                menu={{
                  items: actions || [],
                }}
                placement=\"bottomRight\"
                trigger={['click']}
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </div>
          )}

          {/* Desktop action menu */}
          {actions && actions.length > 0 && (
            <div className=\"hidden sm:block\">
              <Dropdown
                menu={{
                  items: actions,
                }}
                placement=\"bottomRight\"
                trigger={['click']}
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </div>
          )}
        </div>
      </div>

      {/* Mobile extra content */}
      {extra && (
        <div className=\"sm:hidden mt-4\">
          <Space wrap>
            {extra}
          </Space>
        </div>
      )}
    </div>
  );
};

export default PageHeader;", "original_text": ""}]