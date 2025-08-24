import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Dropdown,
  Modal,
  message,
  Table,
  Avatar,
  Typography,
  Tooltip,
  Progress,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  CloudOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useGetCloudProvidersQuery, useDisconnectProviderMutation, useTestConnectionMutation } from '../../store';
import { PageHeader } from '../layout/PageHeader';
import { LoadingSpinner } from '../common';
import { formatFileSize, formatRelativeTime } from '../../utils';

const { Text } = Typography;
const { confirm } = Modal;

interface CloudProvider {
  id: string;
  providerType: string;
  alias: string;
  isActive: boolean;
  lastConnected?: string;
  quota?: {
    total: number;
    used: number;
    available: number;
  };
  status: 'connected' | 'error' | 'disconnected';
  createdAt: string;
}

export const CloudProviderList: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const { data: providers = [], isLoading, refetch } = useGetCloudProvidersQuery();
  const [disconnectProvider] = useDisconnectProviderMutation();
  const [testConnection] = useTestConnectionMutation();

  // Mock data for development
  const mockProviders: CloudProvider[] = [
    {
      id: '1',
      providerType: 'pikpak',
      alias: 'My PikPak Account',
      isActive: true,
      lastConnected: '2024-01-15T10:30:00Z',
      quota: {
        total: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
        used: 1.2 * 1024 * 1024 * 1024 * 1024, // 1.2TB
        available: 0.8 * 1024 * 1024 * 1024 * 1024, // 0.8TB
      },
      status: 'connected',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      providerType: 'synology',
      alias: 'Home NAS',
      isActive: true,
      lastConnected: '2024-01-15T09:45:00Z',
      quota: {
        total: 8 * 1024 * 1024 * 1024 * 1024, // 8TB
        used: 3.5 * 1024 * 1024 * 1024 * 1024, // 3.5TB
        available: 4.5 * 1024 * 1024 * 1024 * 1024, // 4.5TB
      },
      status: 'connected',
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      providerType: 'webdav',
      alias: 'Office WebDAV',
      isActive: false,
      lastConnected: '2024-01-14T16:20:00Z',
      status: 'error',
      createdAt: '2024-01-03T00:00:00Z',
    },
    {
      id: '4',
      providerType: 'gdrive',
      alias: 'Google Drive Personal',
      isActive: true,
      lastConnected: '2024-01-15T11:00:00Z',
      quota: {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        used: 85 * 1024 * 1024 * 1024, // 85GB
        available: 15 * 1024 * 1024 * 1024, // 15GB
      },
      status: 'connected',
      createdAt: '2024-01-05T00:00:00Z',
    },
  ];

  const getProviderIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      pikpak: <CloudOutlined style={{ color: '#1890ff' }} />,
      synology: <CloudOutlined style={{ color: '#ff6600' }} />,
      webdav: <CloudOutlined style={{ color: '#52c41a' }} />,
      gdrive: <CloudOutlined style={{ color: '#4285f4' }} />,
      onedrive: <CloudOutlined style={{ color: '#0078d4' }} />,
      dropbox: <CloudOutlined style={{ color: '#0061ff' }} />,
    };
    return iconMap[type] || <CloudOutlined />;
  };

  const getProviderName = (type: string) => {
    const nameMap: Record<string, string> = {
      pikpak: 'PikPak',
      synology: 'Synology NAS',
      webdav: 'WebDAV',
      gdrive: 'Google Drive',
      onedrive: 'OneDrive',
      dropbox: 'Dropbox',
    };
    return nameMap[type] || type.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      case 'disconnected':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return '연결됨';
      case 'error':
        return '오류';
      case 'disconnected':
        return '연결 끊김';
      default:
        return '알 수 없음';
    }
  };

  const handleDisconnect = (provider: CloudProvider) => {
    confirm({
      title: '클라우드 연결 해제',
      content: `${provider.alias} 연결을 해제하시겠습니까?`,
      icon: <ExclamationCircleOutlined />,
      okText: '해제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await disconnectProvider(provider.id).unwrap();
          message.success('클라우드 연결이 해제되었습니다.');
          refetch();
        } catch (error) {
          message.error('연결 해제에 실패했습니다.');
        }
      },
    });
  };

  const handleTestConnection = async (provider: CloudProvider) => {
    try {
      message.loading('연결 테스트 중...', 0);
      await testConnection(provider.id).unwrap();
      message.destroy();
      message.success('연결 테스트가 성공했습니다.');
    } catch (error) {
      message.destroy();
      message.error('연결 테스트에 실패했습니다.');
    }
  };

  const getActionMenu = (provider: CloudProvider) => [
    {
      key: 'test',
      icon: <SyncOutlined />,
      label: '연결 테스트',
      onClick: () => handleTestConnection(provider),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '설정 편집',
      onClick: () => {
        message.info('설정 편집 기능이 곧 구현될 예정입니다.');
      },
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '고급 설정',
      onClick: () => {
        message.info('고급 설정 기능이 곧 구현될 예정입니다.');
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'disconnect',
      icon: <DisconnectOutlined />,
      label: '연결 해제',
      danger: true,
      onClick: () => handleDisconnect(provider),
    },
  ];

  const renderProviderCard = (provider: CloudProvider) => (
    <Card
      key={provider.id}
      className="transition-all duration-200 hover:shadow-md"
      actions={[
        <Tooltip title="연결 테스트">
          <Button
            type="text"
            icon={<SyncOutlined />}
            onClick={() => handleTestConnection(provider)}
          />
        </Tooltip>,
        <Tooltip title="설정">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => message.info('설정 기능이 곧 구현될 예정입니다.')}
          />
        </Tooltip>,
        <Dropdown
          menu={{
            items: getActionMenu(provider),
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>,
      ]}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar size="large" icon={getProviderIcon(provider.providerType)} />
            <div>
              <div className="flex items-center space-x-2">
                <Text strong className="text-base">
                  {provider.alias}
                </Text>
                <Tag color={getStatusColor(provider.status)}>
                  {getStatusText(provider.status)}
                </Tag>
              </div>
              <Text className="text-sm text-gray-500">
                {getProviderName(provider.providerType)}
              </Text>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        {provider.quota && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Text className="text-sm text-gray-600">스토리지 사용량</Text>
              <Text className="text-sm">
                {formatFileSize(provider.quota.used)} / {formatFileSize(provider.quota.total)}
              </Text>
            </div>
            <Progress
              percent={Math.round((provider.quota.used / provider.quota.total) * 100)}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              showInfo={false}
            />
          </div>
        )}

        {/* Last Connected */}
        {provider.lastConnected && (
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>마지막 연결:</span>
            <span>{formatRelativeTime(provider.lastConnected)}</span>
          </div>
        )}
      </div>
    </Card>
  );

  if (isLoading) {
    return <LoadingSpinner text="클라우드 프로바이더 목록을 불러오는 중..." />;
  }

  return (
    <div>
      <PageHeader
        title="클라우드 관리"
        subtitle="연결된 클라우드 스토리지 프로바이더를 관리하세요"
        extra={
          <Space>
            <Button icon={<SyncOutlined />} onClick={() => refetch()}>
              새로고침
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                window.location.href = '/clouds/connect';
              }}
            >
              클라우드 연결
            </Button>
          </Space>
        }
      />

      <div className="p-4 sm:p-6">
        {/* Statistics */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">총 연결됨</Text>
                  <div className="text-2xl font-semibold">
                    {mockProviders.filter(p => p.status === 'connected').length}
                  </div>
                </div>
                <CheckCircleOutlined className="text-2xl text-green-500" />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">오류 상태</Text>
                  <div className="text-2xl font-semibold">
                    {mockProviders.filter(p => p.status === 'error').length}
                  </div>
                </div>
                <ExclamationCircleOutlined className="text-2xl text-red-500" />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">총 스토리지</Text>
                  <div className="text-2xl font-semibold">
                    {formatFileSize(
                      mockProviders
                        .filter(p => p.quota)
                        .reduce((sum, p) => sum + (p.quota?.total || 0), 0)
                    )}
                  </div>
                </div>
                <CloudOutlined className="text-2xl text-blue-500" />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Provider Cards Grid */}
        {mockProviders.length > 0 ? (
          <Row gutter={[16, 16]}>
            {mockProviders.map((provider) => (
              <Col key={provider.id} xs={24} sm={12} lg={8} xl={6}>
                {renderProviderCard(provider)}
              </Col>
            ))}
          </Row>
        ) : (
          <Card className="text-center py-12">
            <CloudOutlined className="text-6xl text-gray-300 mb-4" />
            <Text className="text-lg text-gray-500 block mb-4">
              연결된 클라우드 프로바이더가 없습니다
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => {
                window.location.href = '/clouds/connect';
              }}
            >
              첫 번째 클라우드 연결하기
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CloudProviderList;