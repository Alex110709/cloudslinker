import React from 'react';
import {
  Row,
  Col,
  Card,
  Progress,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  List,
  Avatar,
  Timeline,
  Statistic,
} from 'antd';
import {
  CloudOutlined,
  SwapOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { formatFileSize, formatRelativeTime } from '../../utils';
import { ProgressBar } from '../common';
import { StatCard } from '../common/StatCard';
import { PageHeader } from '../layout/PageHeader';

const { Text } = Typography;

export const Dashboard: React.FC = () => {
  // Mock data - In real app, this would come from Redux store
  const stats = {
    totalClouds: 5,
    activeTransfers: 3,
    completedTransfers: 127,
    activeSyncJobs: 8,
    totalStorage: 2048 * 1024 * 1024 * 1024, // 2TB
    usedStorage: 1536 * 1024 * 1024 * 1024, // 1.5TB
  };

  const recentTransfers = [
    {
      id: '1',
      source: 'PikPak',
      destination: 'Synology NAS',
      fileName: 'Documents.zip',
      size: 157286400, // 150MB
      status: 'running',
      progress: 75,
      startedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      source: 'WebDAV',
      destination: 'PikPak',
      fileName: 'Photos-2024',
      size: 2147483648, // 2GB
      status: 'completed',
      progress: 100,
      startedAt: '2024-01-15T09:15:00Z',
    },
    {
      id: '3',
      source: 'Synology NAS',
      destination: 'WebDAV',
      fileName: 'Backup-Database.sql',
      size: 52428800, // 50MB
      status: 'failed',
      progress: 0,
      startedAt: '2024-01-15T08:45:00Z',
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'transfer',
      title: 'Documents.zip 전송 완료',
      description: 'PikPak → Synology NAS',
      timestamp: '2024-01-15T11:30:00Z',
      status: 'success',
    },
    {
      id: '2',
      type: 'sync',
      title: '동기화 작업 시작',
      description: 'Photos 폴더 양방향 동기화',
      timestamp: '2024-01-15T11:15:00Z',
      status: 'info',
    },
    {
      id: '3',
      type: 'cloud',
      title: '새 클라우드 연결',
      description: 'Google Drive 계정 추가',
      timestamp: '2024-01-15T10:45:00Z',
      status: 'success',
    },
    {
      id: '4',
      type: 'transfer',
      title: '전송 실패',
      description: 'Backup-Database.sql 전송 중 오류 발생',
      timestamp: '2024-01-15T10:20:00Z',
      status: 'error',
    },
  ];

  const cloudProviders = [
    { name: 'PikPak', status: 'connected', usage: 85 },
    { name: 'Synology NAS', status: 'connected', usage: 60 },
    { name: 'WebDAV Server', status: 'connected', usage: 40 },
    { name: 'Google Drive', status: 'error', usage: 0 },
    { name: 'OneDrive', status: 'disconnected', usage: 0 },
  ];

  const transferColumns = [
    {
      title: '파일명',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (text: string) => (
        <Text strong className="text-sm">
          {text}
        </Text>
      ),
    },
    {
      title: '경로',
      key: 'path',
      render: (record: any) => (
        <div className="text-xs text-gray-500">
          {record.source} → {record.destination}
        </div>
      ),
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => (
        <Text className="text-sm">{formatFileSize(size)}</Text>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        const statusConfig = {
          running: { color: 'blue', text: '진행중' },
          completed: { color: 'green', text: '완료' },
          failed: { color: 'red', text: '실패' },
          paused: { color: 'orange', text: '일시중지' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        
        return (
          <div className="space-y-1">
            <Tag color={config.color}>{config.text}</Tag>
            {status === 'running' && (
              <ProgressBar
                percentage={record.progress}
                size="small"
                showPercentage={false}
              />
            )}
          </div>
        );
      },
    },
    {
      title: '시작 시간',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (time: string) => (
        <Text className="text-xs text-gray-500">
          {formatRelativeTime(time)}
        </Text>
      ),
    },
  ];

  const getActivityIcon = (type: string, status: string) => {
    if (type === 'transfer') {
      return status === 'error' ? (
        <CloseCircleOutlined className="text-red-500" />
      ) : (
        <SwapOutlined className="text-blue-500" />
      );
    }
    if (type === 'sync') {
      return <SyncOutlined className="text-green-500" />;
    }
    if (type === 'cloud') {
      return <CloudOutlined className="text-purple-500" />;
    }
    return <ClockCircleOutlined className="text-gray-500" />;
  };

  const getCloudStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'error':
        return 'red';
      case 'disconnected':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="대시보드"
        subtitle="CloudsLinker 플랫폼의 전체 현황을 확인하세요"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>
              새 작업
            </Button>
          </Space>
        }
        showDivider={false}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Statistics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="연결된 클라우드"
              value={stats.totalClouds}
              icon={<CloudOutlined />}
              variant="primary"
              change={{
                value: 12,
                trend: 'up',
                period: '이번 달',
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="활성 전송"
              value={stats.activeTransfers}
              icon={<SwapOutlined />}
              variant="success"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="완료된 전송"
              value={stats.completedTransfers}
              icon={<CheckCircleOutlined />}
              variant="default"
              change={{
                value: 8,
                trend: 'up',
                period: '지난 주 대비',
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="동기화 작업"
              value={stats.activeSyncJobs}
              icon={<SyncOutlined />}
              variant="warning"
            />
          </Col>
        </Row>

      {/* Storage Usage */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="스토리지 사용량" className="h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Text>전체 용량</Text>
                <Text strong>{formatFileSize(stats.totalStorage)}</Text>
              </div>
              <Progress
                percent={Math.round((stats.usedStorage / stats.totalStorage) * 100)}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                format={(percent) => `${formatFileSize(stats.usedStorage)} / ${formatFileSize(stats.totalStorage)}`}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <Text>사용됨: {formatFileSize(stats.usedStorage)}</Text>
                <Text>
                  남음: {formatFileSize(stats.totalStorage - stats.usedStorage)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="클라우드 프로바이더 상태" className="h-full">
            <List
              size="small"
              dataSource={cloudProviders}
              renderItem={(item) => (
                <List.Item>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center space-x-2">
                      <Avatar size="small" icon={<CloudOutlined />} />
                      <Text>{item.name}</Text>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tag color={getCloudStatusColor(item.status)}>
                        {item.status === 'connected' ? '연결됨' : 
                         item.status === 'error' ? '오류' : '연결 끊김'}
                      </Tag>
                      {item.status === 'connected' && (
                        <Text className="text-xs text-gray-500">
                          {item.usage}%
                        </Text>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Transfers and Activities */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="최근 전송"
            extra={
              <Button type="link" onClick={() => window.location.href = '/transfers'}>
                전체 보기
              </Button>
            }
          >
            <Table
              dataSource={recentTransfers}
              columns={transferColumns}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title="최근 활동"
            extra={
              <Button type="link" onClick={() => window.location.href = '/activities'}>
                전체 보기
              </Button>
            }
          >
            <Timeline
              items={recentActivities.map((activity) => ({
                dot: getActivityIcon(activity.type, activity.status),
                children: (
                  <div className="space-y-1">
                    <Text strong className="text-sm">
                      {activity.title}
                    </Text>
                    <div className="text-xs text-gray-500">
                      {activity.description}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="빠른 작업">
        <Space size="middle" wrap>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={() => window.location.href = '/transfers/new'}
          >
            새 전송 만들기
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={() => window.location.href = '/sync/new'}
          >
            동기화 설정
          </Button>
          <Button
            icon={<CloudOutlined />}
            onClick={() => window.location.href = '/clouds/connect'}
          >
            클라우드 연결
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={() => window.location.href = '/transfers?status=paused'}
          >
            일시중지된 전송 재개
          </Button>
        </Space>
      </Card>
      </div>
    </div>
  );
};

export default Dashboard;