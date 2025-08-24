import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  Progress,
  Tabs,
  Table,
  Timeline,
  Alert,
  Descriptions,
  Tooltip,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useGetTransferJobQuery, useGetTransferProgressQuery } from '../../store';
import { useTransferUpdates } from '../../hooks/useWebSocket';
import { PageHeader } from '../layout/PageHeader';
import { ProgressBar, LoadingSpinner, FileIcon } from '../common';
import { ConnectionIndicator } from '../ConnectionIndicator';
import { formatFileSize, formatRelativeTime, formatTransferSpeed, formatDuration } from '../../utils';
import type { TransferJob, TransferProgress } from '../../types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export const TransferDetails: React.FC = () => {
  const { transferId } = useParams<{ transferId: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const { data: transfer, isLoading } = useGetTransferJobQuery(transferId!);
  const { data: progress } = useGetTransferProgressQuery(transferId!, {
    pollingInterval: transfer?.status === 'running' ? 1000 : 0,
  });

  // Real-time WebSocket updates
  const { transferData, lastUpdate, requestStatus } = useTransferUpdates(transferId);

  // Update last update time when receiving real-time data
  useEffect(() => {
    if (lastUpdate) {
      setLastUpdateTime(lastUpdate);
    }
  }, [lastUpdate]);

  // Merge real-time data with API data
  const currentTransfer = transferData ? { ...transfer, ...transferData } : transfer;

  // Mock data for development
  const mockTransfer: TransferJob = {
    id: transferId || '1',
    userId: 'user1',
    sourceCloudId: 'cloud1',
    destinationCloudId: 'cloud2',
    sourcePath: '/Documents/Projects',
    destinationPath: '/Backup/Projects',
    status: 'running',
    progressPercentage: 75,
    filesTotal: 125,
    filesCompleted: 94,
    filesFailed: 0,
    bytesTotal: 2147483648, // 2GB
    bytesTransferred: 1610612736, // 1.5GB
    transferSpeed: 10485760, // 10MB/s
    estimatedTimeRemaining: 52, // 52 seconds
    filters: {
      includePatterns: ['*.pdf', '*.docx'],
      excludePatterns: ['*temp*'],
      minSize: 1024,
      maxSize: 104857600,
    },
    options: {
      overwriteExisting: false,
      preserveTimestamps: true,
      verifyIntegrity: true,
    },
    startedAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T10:25:00Z',
    updatedAt: '2024-01-15T11:15:00Z',
  };

  const mockFiles = [
    {
      id: '1',
      name: 'Project_Alpha.pdf',
      path: '/Documents/Projects/Project_Alpha.pdf',
      size: 2097152, // 2MB
      status: 'completed',
      transferredAt: '2024-01-15T10:35:00Z',
    },
    {
      id: '2',
      name: 'Design_Assets',
      path: '/Documents/Projects/Design_Assets',
      type: 'folder',
      status: 'running',
      progress: 60,
    },
    {
      id: '3',
      name: 'Large_Video.mp4',
      path: '/Documents/Projects/Large_Video.mp4',
      size: 524288000, // 500MB
      status: 'running',
      progress: 45,
    },
    {
      id: '4',
      name: 'temp_file.tmp',
      path: '/Documents/Projects/temp_file.tmp',
      size: 1024,
      status: 'skipped',
      reason: 'Excluded by filter pattern',
    },
  ];

  const mockLogs = [
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      level: 'info',
      message: 'Transfer job started',
    },
    {
      id: '2',
      timestamp: '2024-01-15T10:30:15Z',
      level: 'info',
      message: 'Connected to source cloud: PikPak',
    },
    {
      id: '3',
      timestamp: '2024-01-15T10:30:30Z',
      level: 'info',
      message: 'Connected to destination cloud: Synology NAS',
    },
    {
      id: '4',
      timestamp: '2024-01-15T10:31:00Z',
      level: 'info',
      message: 'Started scanning source directory: /Documents/Projects',
    },
    {
      id: '5',
      timestamp: '2024-01-15T10:32:00Z',
      level: 'info',
      message: 'Found 125 files to transfer (2.0 GB total)',
    },
    {
      id: '6',
      timestamp: '2024-01-15T10:35:00Z',
      level: 'success',
      message: 'Completed: Project_Alpha.pdf (2.0 MB)',
    },
    {
      id: '7',
      timestamp: '2024-01-15T11:00:00Z',
      level: 'warning',
      message: 'Skipped: temp_file.tmp (excluded by filter)',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'paused':
        return 'warning';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '진행 중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      case 'paused':
        return '일시중지';
      case 'cancelled':
        return '취소됨';
      case 'pending':
        return '대기 중';
      default:
        return status;
    }
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'processing';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      case 'success':
        return 'green';
      case 'info':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <ExclamationCircleOutlined />;
      case 'warning':
        return <InfoCircleOutlined />;
      case 'success':
        return <CheckCircleOutlined />;
      case 'info':
        return <InfoCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const fileColumns = [
    {
      title: '파일명',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div className="flex items-center space-x-2">
          <FileIcon fileName={name} fileType={record.type || 'file'} size={16} />
          <Text className="truncate">{name}</Text>
        </div>
      ),
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number, record: any) => (
        <Text className="text-sm">
          {record.type === 'folder' ? '-' : formatFileSize(size)}
        </Text>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: any) => (
        <div className="space-y-1">
          <Tag color={getFileStatusColor(status)}>
            {status === 'completed' ? '완료' :
             status === 'running' ? '진행 중' :
             status === 'failed' ? '실패' :
             status === 'skipped' ? '제외됨' : status}
          </Tag>
          {status === 'running' && record.progress && (
            <Progress percent={record.progress} size="small" showInfo={false} />
          )}
          {status === 'skipped' && record.reason && (
            <Text type="secondary" className="text-xs">
              {record.reason}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '시간',
      key: 'time',
      width: 120,
      render: (_, record: any) => (
        <Text className="text-xs text-gray-500">
          {record.transferredAt ? formatRelativeTime(record.transferredAt) : '-'}
        </Text>
      ),
    },
  ];

  const handleAction = (action: string) => {
    switch (action) {
      case 'pause':
        message.info('일시중지 기능이 곧 구현될 예정입니다.');
        break;
      case 'resume':
        message.info('재개 기능이 곧 구현될 예정입니다.');
        break;
      case 'cancel':
        message.info('취소 기능이 곧 구현될 예정입니다.');
        break;
      case 'retry':
        message.info('재시도 기능이 곧 구현될 예정입니다.');
        break;
      default:
        break;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="전송 진행률">
            <div className="space-y-4">
              <ProgressBar
                percentage={mockTransfer.progressPercentage}
                bytesTransferred={mockTransfer.bytesTransferred}
                bytesTotal={mockTransfer.bytesTotal}
                transferSpeed={mockTransfer.transferSpeed}
                estimatedTimeRemaining={mockTransfer.estimatedTimeRemaining}
                showPercentage={true}
                showBytes={true}
                showSpeed={true}
                showTimeRemaining={true}
                size="large"
              />
              
              <Row gutter={[16, 16]} className="mt-4">
                <Col xs={12} sm={6}>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-blue-600">
                      {mockTransfer.filesCompleted}
                    </div>
                    <div className="text-sm text-gray-500">완료된 파일</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-green-600">
                      {mockTransfer.filesTotal}
                    </div>
                    <div className="text-sm text-gray-500">총 파일</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-red-600">
                      {mockTransfer.filesFailed}
                    </div>
                    <div className="text-sm text-gray-500">실패한 파일</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-purple-600">
                      {formatTransferSpeed(mockTransfer.transferSpeed)}
                    </div>
                    <div className="text-sm text-gray-500">전송 속도</div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="전송 정보">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="상태">
                <Tag color={getStatusColor(mockTransfer.status)}>
                  {getStatusText(mockTransfer.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="시작 시간">
                {formatRelativeTime(mockTransfer.startedAt!)}
              </Descriptions.Item>
              <Descriptions.Item label="생성 시간">
                {formatRelativeTime(mockTransfer.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="마지막 업데이트">
                {formatRelativeTime(mockTransfer.updatedAt)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="소스">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Text strong>경로:</Text>
                <Text code>{mockTransfer.sourcePath}</Text>
              </div>
              <div className="flex items-center space-x-2">
                <Text strong>클라우드:</Text>
                <Text>PikPak Account</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="대상">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Text strong>경로:</Text>
                <Text code>{mockTransfer.destinationPath}</Text>
              </div>
              <div className="flex items-center space-x-2">
                <Text strong>클라우드:</Text>
                <Text>Synology NAS</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {mockTransfer.filters && (
        <Card title="필터 설정">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              {mockTransfer.filters.includePatterns && (
                <div className="mb-2">
                  <Text strong>포함 패턴:</Text>
                  <div className="mt-1">
                    {mockTransfer.filters.includePatterns.map((pattern, index) => (
                      <Tag key={index} className="mb-1">{pattern}</Tag>
                    ))}
                  </div>
                </div>
              )}
              {mockTransfer.filters.excludePatterns && (
                <div>
                  <Text strong>제외 패턴:</Text>
                  <div className="mt-1">
                    {mockTransfer.filters.excludePatterns.map((pattern, index) => (
                      <Tag key={index} color="red" className="mb-1">{pattern}</Tag>
                    ))}
                  </div>
                </div>
              )}
            </Col>
            <Col xs={24} md={12}>
              <div className="space-y-2">
                {mockTransfer.filters.minSize && (
                  <div>
                    <Text strong>최소 크기:</Text> {formatFileSize(mockTransfer.filters.minSize)}
                  </div>
                )}
                {mockTransfer.filters.maxSize && (
                  <div>
                    <Text strong>최대 크기:</Text> {formatFileSize(mockTransfer.filters.maxSize)}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );

  const renderFiles = () => (
    <Card>
      <Table
        columns={fileColumns}
        dataSource={mockFiles}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}개`,
        }}
      />
    </Card>
  );

  const renderLogs = () => (
    <Card>
      <Timeline
        items={mockLogs.map((log) => ({
          color: getLogLevelColor(log.level),
          dot: getLogLevelIcon(log.level),
          children: (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Tag color={getLogLevelColor(log.level)} size="small">
                  {log.level.toUpperCase()}
                </Tag>
                <Text className="text-sm">{log.message}</Text>
              </div>
              <Text type="secondary" className="text-xs">
                {formatRelativeTime(log.timestamp)}
              </Text>
            </div>
          ),
        }))}
      />
    </Card>
  );

  if (isLoading) {
    return <LoadingSpinner text="전송 정보를 불러오는 중..." />;
  }

  return (
    <div>
      <PageHeader
        title={`전송 작업 #${transferId}`}
        subtitle={
          <Space direction="vertical" size={0}>
            <Text>{`${mockTransfer.sourcePath} → ${mockTransfer.destinationPath}`}</Text>
            <Space size={12}>
              <ConnectionIndicator size="small" placement="inline" />
              {lastUpdateTime && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  마지막 업데이트: {formatRelativeTime(lastUpdateTime.toISOString())}
                </Text>
              )}
            </Space>
          </Space>
        }
        breadcrumbs={[
          { title: '파일 전송', path: '/transfers' },
          { title: `전송 #${transferId}` },
        ]}
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                window.location.reload();
                requestStatus(); // Request fresh status via WebSocket
              }}
            >
              새로고침
            </Button>
            {mockTransfer.status === 'running' && (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={() => handleAction('pause')}
              >
                일시중지
              </Button>
            )}
            {mockTransfer.status === 'paused' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction('resume')}
              >
                재개
              </Button>
            )}
            {['running', 'paused'].includes(mockTransfer.status) && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => handleAction('cancel')}
              >
                취소
              </Button>
            )}
            {mockTransfer.status === 'failed' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction('retry')}
              >
                재시도
              </Button>
            )}
            <Button icon={<DownloadOutlined />}>
              로그 다운로드
            </Button>
          </Space>
        }
      />

      <div className="p-4 sm:p-6">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="개요" key="overview">
            {renderOverview()}
          </TabPane>
          <TabPane tab="파일 목록" key="files">
            {renderFiles()}
          </TabPane>
          <TabPane tab="로그" key="logs">
            {renderLogs()}
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default TransferDetails;