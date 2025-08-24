import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Dropdown,
  Modal,
  message,
  Input,
  Select,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Badge,
  Switch,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
  DownloadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ScheduleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  useGetSyncJobsQuery,
  useStartSyncMutation,
  usePauseSyncMutation,
  useResumeSyncMutation,
  useCancelSyncMutation,
  useDeleteSyncMutation,
  useUpdateSyncSettingsMutation,
} from '../../store';
import { useSyncUpdates, useWebSocketConnection } from '../../hooks/useWebSocket';
import { PageHeader } from '../layout/PageHeader';
import { StatCard, LoadingSpinner, ProgressBar } from '../common';
import { ConnectionIndicator } from '../ConnectionIndicator';
import { formatFileSize, formatRelativeTime, formatTransferSpeed, formatDuration } from '../../utils';
import type { SyncJob } from '../../types';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;
const { confirm } = Modal;

export const SyncList: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<SyncJob[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  const { data, isLoading, refetch } = useGetSyncJobsQuery({
    ...pagination,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchText || undefined,
  });

  const { isConnected } = useWebSocketConnection();

  const [startSync] = useStartSyncMutation();
  const [pauseSync] = usePauseSyncMutation();
  const [resumeSync] = useResumeSyncMutation();
  const [cancelSync] = useCancelSyncMutation();
  const [deleteSync] = useDeleteSyncMutation();
  const [updateSyncSettings] = useUpdateSyncSettingsMutation();

  // Mock data for development
  const mockSyncJobs: SyncJob[] = [
    {
      id: '1',
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
    },
    {
      id: '2',
      userId: 'user1',
      sourceCloudId: 'cloud2',
      destinationCloudId: 'cloud3',
      sourcePath: '/Photos',
      destinationPath: '/Gallery',
      syncDirection: 'source_to_destination',
      status: 'scheduled',
      isEnabled: true,
      schedule: {
        type: 'cron',
        cronExpression: '0 2 * * *', // Daily at 2 AM
      },
      options: {
        deleteOrphaned: true,
        preserveTimestamps: true,
        skipHidden: false,
        conflictResolution: 'manual',
      },
      lastSyncAt: '2024-01-14T02:00:00Z',
      nextSyncAt: '2024-01-16T02:00:00Z',
      filesTotal: 0,
      filesSynced: 0,
      filesConflicted: 0,
      filesSkipped: 0,
      bytesTotal: 0,
      bytesSynced: 0,
      progressPercentage: 0,
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      createdAt: '2024-01-10T15:30:00Z',
      updatedAt: '2024-01-14T02:15:00Z',
    },
    {
      id: '3',
      userId: 'user1',
      sourceCloudId: 'cloud1',
      destinationCloudId: 'cloud4',
      sourcePath: '/Music/Library',
      destinationPath: '/Audio/Music',
      syncDirection: 'bidirectional',
      status: 'completed',
      isEnabled: true,
      schedule: {
        type: 'manual',
      },
      options: {
        deleteOrphaned: false,
        preserveTimestamps: true,
        skipHidden: true,
        conflictResolution: 'skip',
      },
      lastSyncAt: '2024-01-15T08:45:00Z',
      nextSyncAt: null,
      filesTotal: 1500,
      filesSynced: 1500,
      filesConflicted: 0,
      filesSkipped: 8,
      bytesTotal: 4294967296, // 4GB
      bytesSynced: 4294967296, // 4GB
      progressPercentage: 100,
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      createdAt: '2024-01-15T08:00:00Z',
      updatedAt: '2024-01-15T09:00:00Z',
    },
    {
      id: '4',
      userId: 'user1',
      sourceCloudId: 'cloud3',
      destinationCloudId: 'cloud1',
      sourcePath: '/Documents/Projects',
      destinationPath: '/Work/Projects',
      syncDirection: 'destination_to_source',
      status: 'failed',
      isEnabled: false,
      schedule: {
        type: 'interval',
        intervalMinutes: 120,
      },
      options: {
        deleteOrphaned: true,
        preserveTimestamps: true,
        skipHidden: true,
        conflictResolution: 'newest',
      },
      lastSyncAt: '2024-01-15T07:00:00Z',
      nextSyncAt: '2024-01-15T12:00:00Z',
      filesTotal: 85,
      filesSynced: 23,
      filesConflicted: 1,
      filesSkipped: 0,
      bytesTotal: 536870912, // 512MB
      bytesSynced: 134217728, // 128MB
      progressPercentage: 25,
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      errorMessage: 'Authentication failed for destination cloud',
      createdAt: '2024-01-14T18:00:00Z',
      updatedAt: '2024-01-15T07:30:00Z',
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

  const getSyncDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bidirectional':
        return '⇄';
      case 'source_to_destination':
        return '→';
      case 'destination_to_source':
        return '←';
      default:
        return direction;
    }
  };

  const getScheduleText = (schedule: any) => {
    if (!schedule) return '-';
    
    switch (schedule.type) {
      case 'manual':
        return '수동';
      case 'interval':
        return `${schedule.intervalMinutes}분마다`;
      case 'cron':
        return schedule.cronExpression;
      default:
        return schedule.type;
    }
  };

  const handleAction = async (action: string, sync: SyncJob) => {
    try {
      switch (action) {
        case 'start':
          await startSync(sync.id).unwrap();
          message.success('동기화가 시작되었습니다.');
          break;
        case 'pause':
          await pauseSync(sync.id).unwrap();
          message.success('동기화가 일시중지되었습니다.');
          break;
        case 'resume':
          await resumeSync(sync.id).unwrap();
          message.success('동기화가 재개되었습니다.');
          break;
        case 'cancel':
          await cancelSync(sync.id).unwrap();
          message.success('동기화가 취소되었습니다.');
          break;
        case 'delete':
          confirm({
            title: '동기화 작업을 삭제하시겠습니까?',
            content: '이 작업은 되돌릴 수 없습니다.',
            okText: '삭제',
            okType: 'danger',
            cancelText: '취소',
            onOk: async () => {
              await deleteSync(sync.id).unwrap();
              message.success('동기화 작업이 삭제되었습니다.');
            },
          });
          break;
        case 'toggle':
          await updateSyncSettings(sync.id, { isEnabled: !sync.isEnabled }).unwrap();
          message.success(`동기화가 ${!sync.isEnabled ? '활성화' : '비활성화'}되었습니다.`);
          break;
        case 'view':
          window.location.href = `/sync/${sync.id}`;
          break;
        case 'settings':
          window.location.href = `/sync/${sync.id}/settings`;
          break;
        default:
          message.info(`${action} 기능이 곧 구현될 예정입니다.`);
          break;
      }
    } catch (error: any) {
      message.error(error?.data?.message || `${action} 작업 중 오류가 발생했습니다.`);
    }
  };

  const getActionButtons = (sync: SyncJob) => {
    const buttons = [];
    
    if (sync.status === 'scheduled' || sync.status === 'paused') {
      buttons.push(
        <Tooltip key="start" title="동기화 시작">
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            size="small"
            onClick={() => handleAction('start', sync)}
          />
        </Tooltip>
      );
    }
    
    if (sync.status === 'running') {
      buttons.push(
        <Tooltip key="pause" title="일시중지">
          <Button
            type="text"
            icon={<PauseCircleOutlined />}
            size="small"
            onClick={() => handleAction('pause', sync)}
          />
        </Tooltip>
      );
    }
    
    if (['running', 'paused'].includes(sync.status)) {
      buttons.push(
        <Tooltip key="cancel" title="취소">
          <Button
            type="text"
            icon={<StopOutlined />}
            size="small"
            onClick={() => handleAction('cancel', sync)}
          />
        </Tooltip>
      );
    }
    
    buttons.push(
      <Tooltip key="view" title="상세 보기">
        <Button
          type="text"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleAction('view', sync)}
        />
      </Tooltip>
    );

    return buttons;
  };

  const getActionMenu = (sync: SyncJob) => [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '설정',
      onClick: () => handleAction('settings', sync),
    },
    {
      key: 'toggle',
      icon: sync.isEnabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
      label: sync.isEnabled ? '비활성화' : '활성화',
      onClick: () => handleAction('toggle', sync),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '삭제',
      danger: true,
      onClick: () => handleAction('delete', sync),
    },
  ];

  const columns = [
    {
      title: '동기화 작업',
      key: 'sync',
      render: (_, record: SyncJob) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Text strong className="truncate">
              {record.sourcePath} {getSyncDirectionIcon(record.syncDirection)} {record.destinationPath}
            </Text>
            <Switch
              size="small"
              checked={record.isEnabled}
              onChange={() => handleAction('toggle', record)}
            />
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>소스: PikPak</span>
            <span>대상: Synology NAS</span>
            <span>방향: {getSyncDirectionText(record.syncDirection)}</span>
          </div>
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: SyncJob) => (
        <div className="space-y-1">
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          {record.errorMessage && (
            <Tooltip title={record.errorMessage}>
              <Text type="danger" className="text-xs truncate block max-w-20">
                {record.errorMessage}
              </Text>
            </Tooltip>
          )}
        </div>
      ),
      filters: [
        { text: '동기화 중', value: 'running' },
        { text: '완료', value: 'completed' },
        { text: '실패', value: 'failed' },
        { text: '일시중지', value: 'paused' },
        { text: '예약됨', value: 'scheduled' },
      ],
      onFilter: (value: string, record: SyncJob) => record.status === value,
    },
    {
      title: '진행률',
      key: 'progress',
      width: 180,
      render: (_, record: SyncJob) => (
        <div className="space-y-1">
          {record.status === 'running' && (
            <>
              <div className="flex justify-between text-xs">
                <span>{record.progressPercentage}%</span>
                <span>{record.filesSynced} / {record.filesTotal}</span>
              </div>
              <Progress
                percent={record.progressPercentage}
                size="small"
                showInfo={false}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatFileSize(record.bytesSynced)} / {formatFileSize(record.bytesTotal)}</span>
                {record.transferSpeed > 0 && (
                  <span>{formatTransferSpeed(record.transferSpeed)}</span>
                )}
              </div>
            </>
          )}
          {record.status !== 'running' && record.filesTotal > 0 && (
            <div className="text-xs space-y-1">
              <div>파일: {record.filesSynced} / {record.filesTotal}</div>
              <div>크기: {formatFileSize(record.bytesSynced)}</div>
              {record.filesConflicted > 0 && (
                <div className="text-orange-500">충돌: {record.filesConflicted}</div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '스케줄',
      key: 'schedule',
      width: 120,
      render: (_, record: SyncJob) => (
        <div className="space-y-1 text-xs">
          <div>{getScheduleText(record.schedule)}</div>
          {record.lastSyncAt && (
            <div className="text-gray-500">
              마지막: {formatRelativeTime(record.lastSyncAt)}
            </div>
          )}
          {record.nextSyncAt && (
            <div className="text-blue-500">
              다음: {formatRelativeTime(record.nextSyncAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, record: SyncJob) => (
        <div className="flex items-center space-x-1">
          {getActionButtons(record)}
          <Dropdown
            menu={{ items: getActionMenu(record) }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </div>
      ),
    },
  ];

  const stats = {
    total: mockSyncJobs.length,
    running: mockSyncJobs.filter(s => s.status === 'running').length,
    scheduled: mockSyncJobs.filter(s => s.status === 'scheduled').length,
    failed: mockSyncJobs.filter(s => s.status === 'failed').length,
    enabled: mockSyncJobs.filter(s => s.isEnabled).length,
  };

  const rowSelection = {
    selectedRowKeys: selectedRows.map(r => r.id),
    onChange: (selectedRowKeys: React.Key[], selectedRows: SyncJob[]) => {
      setSelectedRows(selectedRows);
    },
  };

  return (
    <div>
      <PageHeader
        title="동기화 관리"
        subtitle={
          <Space>
            <span>클라우드 간 자동 동기화 작업을 관리하세요</span>
            <ConnectionIndicator size="small" placement="inline" />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              새로고침
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                window.location.href = '/sync/new';
              }}
            >
              새 동기화
            </Button>
          </Space>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <StatCard
              title="총 동기화"
              value={stats.total}
              icon={<SyncOutlined />}
              variant="default"
            />
          </Col>
          <Col xs={24} sm={6}>
            <StatCard
              title="진행 중"
              value={stats.running}
              icon={<ClockCircleOutlined />}
              variant="primary"
            />
          </Col>
          <Col xs={24} sm={6}>
            <StatCard
              title="예약됨"
              value={stats.scheduled}
              icon={<ScheduleOutlined />}
              variant="success"
            />
          </Col>
          <Col xs={24} sm={6}>
            <StatCard
              title="활성화"
              value={stats.enabled}
              icon={<CheckCircleOutlined />}
              variant="info"
            />
          </Col>
        </Row>

        {/* Filters and Search */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Search
                placeholder="동기화 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={() => refetch()}
                style={{ width: 300 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
              >
                <Option value="all">모든 상태</Option>
                <Option value="running">진행 중</Option>
                <Option value="scheduled">예약됨</Option>
                <Option value="completed">완료</Option>
                <Option value="failed">실패</Option>
                <Option value="paused">일시중지</Option>
              </Select>
            </div>

            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge count={selectedRows.length}>
                  <Text>선택된 항목</Text>
                </Badge>
                <Button size="small">일괄 시작</Button>
                <Button size="small">일괄 중지</Button>
                <Button size="small" danger>일괄 삭제</Button>
              </div>
            )}
          </div>
        </Card>

        {/* Sync Table */}
        <Card>
          {isLoading ? (
            <LoadingSpinner text="동기화 목록을 불러오는 중..." />
          ) : (
            <Table
              columns={columns}
              dataSource={mockSyncJobs}
              rowKey="id"
              rowSelection={rowSelection}
              pagination={{
                total: data?.pagination?.total || mockSyncJobs.length,
                current: pagination.page,
                pageSize: pagination.limit,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} / 총 ${total}개`,
                onChange: (page, limit) => setPagination({ page, limit: limit || 20 }),
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default SyncList;