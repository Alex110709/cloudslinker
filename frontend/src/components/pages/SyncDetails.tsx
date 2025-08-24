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
  Switch,
  Statistic,
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
  SettingOutlined,
  SyncOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useGetSyncJobQuery, useGetSyncProgressQuery } from '../../store';
import { useSyncUpdates } from '../../hooks/useWebSocket';
import { PageHeader } from '../layout/PageHeader';
import { ProgressBar, LoadingSpinner, FileIcon } from '../common';
import { ConnectionIndicator } from '../ConnectionIndicator';
import { formatFileSize, formatRelativeTime, formatTransferSpeed, formatDuration } from '../../utils';
import type { SyncJob, SyncProgress } from '../../types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export const SyncDetails: React.FC = () => {
  const { syncId } = useParams<{ syncId: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const { data: sync, isLoading } = useGetSyncJobQuery(syncId!);
  const { data: progress } = useGetSyncProgressQuery(syncId!, {
    pollingInterval: sync?.status === 'running' ? 1000 : 0,
  });

  // Real-time WebSocket updates
  const { syncData, lastUpdate, requestStatus } = useSyncUpdates(syncId);

  // Update last update time when receiving real-time data
  useEffect(() => {
    if (lastUpdate) {
      setLastUpdateTime(lastUpdate);
    }
  }, [lastUpdate]);

  // Merge real-time data with API data
  const currentSync = syncData ? { ...sync, ...syncData } : sync;

  // Mock data for development
  const mockSync: SyncJob = {
    id: syncId || '1',
    userId: 'user1',
    sourceCloudId: 'cloud1',
    destinationCloudId: 'cloud2',
    sourcePath: '/Documents/Work',
    destinationPath: '/Backup/Work',
    syncDirection: 'bidirectional',
    status: 'running',
    isEnabled: true,
    schedule: {
      type: 'interval',
      intervalMinutes: 60,
    },
    options: {
      deleteOrphaned: false,
      preserveTimestamps: true,
      skipHidden: true,
      conflictResolution: 'newest',
    },
    lastSyncAt: '2024-01-15T10:30:00Z',
    nextSyncAt: '2024-01-15T11:30:00Z',
    filesTotal: 250,
    filesSynced: 180,
    filesConflicted: 2,
    filesSkipped: 1,
    bytesTotal: 1073741824, // 1GB
    bytesSynced: 751619277, // ~716MB
    progressPercentage: 70,
    transferSpeed: 5242880, // 5MB/s
    estimatedTimeRemaining: 45, // 45 seconds
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:35:00Z',
  };

  const mockFiles = [
    {
      id: '1',
      name: 'Project_Report.docx',
      path: '/Documents/Work/Project_Report.docx',
      size: 1048576, // 1MB
      status: 'synced',
      syncDirection: 'source_to_destination',
      lastModified: '2024-01-15T10:20:00Z',
      syncedAt: '2024-01-15T10:25:00Z',
    },
    {
      id: '2',
      name: 'Images',
      path: '/Documents/Work/Images',
      type: 'folder',
      status: 'syncing',
      syncDirection: 'bidirectional',
      filesCount: 15,
      progress: 60,
    },
    {
      id: '3',
      name: 'Budget_2024.xlsx',
      path: '/Documents/Work/Budget_2024.xlsx',
      size: 524288, // 512KB
      status: 'conflict',
      syncDirection: 'bidirectional',
      conflictReason: 'Both files modified',
      lastModified: '2024-01-15T10:15:00Z',
    },
    {
      id: '4',
      name: '.temp_file',
      path: '/Documents/Work/.temp_file',
      size: 1024,
      status: 'skipped',
      reason: 'Hidden file excluded by settings',
    },
  ];

  const mockConflicts = [
    {
      id: '1',
      filePath: '/Documents/Work/Budget_2024.xlsx',
      sourceModified: '2024-01-15T10:15:00Z',
      destinationModified: '2024-01-15T10:18:00Z',
      sourceSize: 524288,
      destinationSize: 528384,
      resolution: 'pending',
    },
    {
      id: '2',
      filePath: '/Documents/Work/Meeting_Notes.txt',
      sourceModified: '2024-01-15T09:30:00Z',
      destinationModified: '2024-01-15T09:32:00Z',
      sourceSize: 2048,
      destinationSize: 2156,
      resolution: 'use_newest',
      resolvedAt: '2024-01-15T10:30:00Z',
    },
  ];

  const mockLogs = [
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      level: 'info',
      message: 'Sync job started',
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
      message: 'Started scanning directories for changes',
    },
    {
      id: '5',
      timestamp: '2024-01-15T10:32:00Z',
      level: 'info',
      message: 'Found 25 files to sync (156 MB total)',
    },
    {
      id: '6',
      timestamp: '2024-01-15T10:35:00Z',
      level: 'success',
      message: 'Synced: Project_Report.docx (1.0 MB)',
    },
    {
      id: '7',
      timestamp: '2024-01-15T10:36:00Z',
      level: 'warning',
      message: 'Conflict detected: Budget_2024.xlsx (both files modified)',
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
      case 'scheduled':
        return 'blue';
      case 'disabled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '동기화 중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      case 'paused':
        return '일시중지';
      case 'scheduled':
        return '예약됨';
      case 'disabled':
        return '비활성화';
      default:
        return status;
    }
  };

  const getSyncDirectionText = (direction: string) => {
    switch (direction) {
      case 'bidirectional':
        return '양방향';
      case 'source_to_destination':
        return '소스 → 대상';
      case 'destination_to_source':
        return '대상 → 소스';
      default:
        return direction;
    }
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'success';
      case 'syncing':
        return 'processing';
      case 'conflict':
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
      case 'settings':
        window.location.href = `/sync/${syncId}/settings`;
        break;
      default:
        break;
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
          {record.type === 'folder' 
            ? `${record.filesCount || 0} 파일` 
            : formatFileSize(size)}
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
            {status === 'synced' ? '동기화됨' :
             status === 'syncing' ? '동기화 중' :
             status === 'conflict' ? '충돌' :
             status === 'skipped' ? '제외됨' : status}
          </Tag>
          {status === 'syncing' && record.progress && (
            <Progress percent={record.progress} size="small" showInfo={false} />
          )}
          {status === 'conflict' && record.conflictReason && (
            <Text type="danger" className="text-xs">
              {record.conflictReason}
            </Text>
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
      title: '방향',
      dataIndex: 'syncDirection',
      key: 'syncDirection',
      width: 100,
      render: (direction: string) => (
        <Text className="text-xs">
          {getSyncDirectionText(direction)}
        </Text>
      ),
    },
    {
      title: '시간',
      key: 'time',
      width: 120,
      render: (_, record: any) => (
        <div className="text-xs text-gray-500 space-y-1">
          {record.lastModified && (
            <div>수정: {formatRelativeTime(record.lastModified)}</div>
          )}
          {record.syncedAt && (
            <div>동기화: {formatRelativeTime(record.syncedAt)}</div>
          )}
        </div>
      ),
    },
  ];

  const conflictColumns = [
    {
      title: '파일 경로',
      dataIndex: 'filePath',
      key: 'filePath',
    },
    {
      title: '소스',
      key: 'source',
      render: (_, record: any) => (
        <div className="text-xs space-y-1">
          <div>수정: {formatRelativeTime(record.sourceModified)}</div>
          <div>크기: {formatFileSize(record.sourceSize)}</div>
        </div>
      ),
    },
    {
      title: '대상',
      key: 'destination',
      render: (_, record: any) => (
        <div className="text-xs space-y-1">
          <div>수정: {formatRelativeTime(record.destinationModified)}</div>
          <div>크기: {formatFileSize(record.destinationSize)}</div>
        </div>
      ),
    },
    {
      title: '해결 방법',
      dataIndex: 'resolution',
      key: 'resolution',
      render: (resolution: string, record: any) => (
        <div className="space-y-1">
          <Tag color={resolution === 'pending' ? 'orange' : 'green'}>
            {resolution === 'pending' ? '대기 중' :
             resolution === 'use_newest' ? '최신 사용' :
             resolution === 'use_largest' ? '큰 파일 사용' :
             resolution === 'manual' ? '수동 해결' : resolution}
          </Tag>
          {record.resolvedAt && (
            <div className="text-xs text-gray-500">
              해결: {formatRelativeTime(record.resolvedAt)}
            </div>
          )}
        </div>
      ),
    },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="동기화 진행률">
            <div className="space-y-4">
              {mockSync.status === 'running' && (
                <ProgressBar
                  percentage={mockSync.progressPercentage}
                  bytesTransferred={mockSync.bytesSynced}
                  bytesTotal={mockSync.bytesTotal}
                  transferSpeed={mockSync.transferSpeed}
                  estimatedTimeRemaining={mockSync.estimatedTimeRemaining}
                  showPercentage={true}
                  showBytes={true}
                  showSpeed={true}
                  showTimeRemaining={true}
                  size="large"
                />
              )}
              
              <Row gutter={[16, 16]} className="mt-4">
                <Col xs={12} sm={6}>
                  <Statistic
                    title="동기화된 파일"
                    value={mockSync.filesSynced}
                    valueStyle={{ color: '#3f8600' }}
                    suffix={`/ ${mockSync.filesTotal}`}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="충돌 파일"
                    value={mockSync.filesConflicted}
                    valueStyle={{ color: mockSync.filesConflicted > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="제외 파일"
                    value={mockSync.filesSkipped}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="데이터 크기"
                    value={formatFileSize(mockSync.bytesSynced)}
                    suffix={`/ ${formatFileSize(mockSync.bytesTotal)}`}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="동기화 정보">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="상태">
                <Tag color={getStatusColor(mockSync.status)}>
                  {getStatusText(mockSync.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="동기화 방향">
                {getSyncDirectionText(mockSync.syncDirection)}
              </Descriptions.Item>
              <Descriptions.Item label="활성화 상태">
                <Switch 
                  checked={mockSync.isEnabled} 
                  size="small"
                  onChange={(checked) => {
                    message.info(`동기화가 ${checked ? '활성화' : '비활성화'}되었습니다.`);
                  }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="마지막 동기화">
                {mockSync.lastSyncAt ? formatRelativeTime(mockSync.lastSyncAt) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="다음 동기화">
                {mockSync.nextSyncAt ? formatRelativeTime(mockSync.nextSyncAt) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="생성 시간">
                {formatRelativeTime(mockSync.createdAt)}
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
                <Text code>{mockSync.sourcePath}</Text>
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
                <Text code>{mockSync.destinationPath}</Text>
              </div>
              <div className="flex items-center space-x-2">
                <Text strong>클라우드:</Text>
                <Text>Synology NAS</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="동기화 설정">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div className="space-y-2">
              <div><Text strong>스케줄:</Text> 60분마다</div>
              <div><Text strong>충돌 해결:</Text> 최신 파일 우선</div>
              <div><Text strong>고아 파일:</Text> 삭제하지 않음</div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="space-y-2">
              <div><Text strong>타임스탬프 보존:</Text> 예</div>
              <div><Text strong>숨김 파일:</Text> 제외</div>
            </div>
          </Col>
        </Row>
      </Card>
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

  const renderConflicts = () => (
    <Card
      title={
        <Space>
          <span>충돌 파일</span>
          <Badge count={mockConflicts.filter(c => c.resolution === 'pending').length} />
        </Space>
      }
    >
      <Table
        columns={conflictColumns}
        dataSource={mockConflicts}
        rowKey="id"
        pagination={false}
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
    return <LoadingSpinner text="동기화 정보를 불러오는 중..." />;
  }

  return (
    <div>
      <PageHeader
        title={`동기화 작업 #${syncId}`}
        subtitle={
          <Space direction="vertical" size={0}>
            <Text>{`${mockSync.sourcePath} ⇄ ${mockSync.destinationPath}`}</Text>
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
          { title: '동기화', path: '/sync' },
          { title: `동기화 #${syncId}` },
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
            {mockSync.status === 'running' && (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={() => handleAction('pause')}
              >
                일시중지
              </Button>
            )}
            {mockSync.status === 'paused' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction('resume')}
              >
                재개
              </Button>
            )}
            {['running', 'paused'].includes(mockSync.status) && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => handleAction('cancel')}
              >
                취소
              </Button>
            )}
            {mockSync.status === 'failed' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction('retry')}
              >
                재시도
              </Button>
            )}
            <Button 
              icon={<SettingOutlined />}
              onClick={() => handleAction('settings')}
            >
              설정
            </Button>
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
          <TabPane 
            tab={
              <Space>
                <span>충돌</span>
                <Badge count={mockConflicts.filter(c => c.resolution === 'pending').length} size="small" />
              </Space>
            } 
            key="conflicts"
          >
            {renderConflicts()}
          </TabPane>
          <TabPane tab="로그" key="logs">
            {renderLogs()}
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default SyncDetails;