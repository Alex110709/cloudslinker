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
} from '@ant-design/icons';
import {
  useGetTransferJobsQuery,
  useStartTransferMutation,
  usePauseTransferMutation,
  useResumeTransferMutation,
  useCancelTransferMutation,
  useDeleteTransferMutation,
  useRetryTransferMutation,
} from '../../store';
import { useMultipleTransfers, useWebSocketConnection } from '../../hooks/useWebSocket';
import { PageHeader } from '../layout/PageHeader';
import { StatCard, LoadingSpinner, ProgressBar } from '../common';
import { ConnectionIndicator } from '../ConnectionIndicator';
import { formatFileSize, formatRelativeTime, formatTransferSpeed, formatDuration } from '../../utils';
import type { TransferJob } from '../../types';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;
const { confirm } = Modal;

export const TransferList: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<TransferJob[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [realTimeUpdates, setRealTimeUpdates] = useState<Record<string, any>>({});

  const { data, isLoading, refetch } = useGetTransferJobsQuery({
    ...pagination,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchText || undefined,
  });

  const { isConnected } = useWebSocketConnection();

  // Get transfer IDs for real-time monitoring
  const transferIds = mockTransfers.map(t => t.id);
  const { transfersData, lastUpdates } = useMultipleTransfers(transferIds);

  // Merge real-time data with mock data
  const enhancedTransfers = mockTransfers.map(transfer => {
    const realtimeData = transfersData[transfer.id];
    return realtimeData ? { ...transfer, ...realtimeData } : transfer;
  });

  const [startTransfer] = useStartTransferMutation();
  const [pauseTransfer] = usePauseTransferMutation();
  const [resumeTransfer] = useResumeTransferMutation();
  const [cancelTransfer] = useCancelTransferMutation();
  const [deleteTransfer] = useDeleteTransferMutation();
  const [retryTransfer] = useRetryTransferMutation();

  // Mock data for development
  const mockTransfers: TransferJob[] = [
    {
      id: '1',
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
      startedAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:25:00Z',
      updatedAt: '2024-01-15T11:15:00Z',
    },
    {
      id: '2',
      userId: 'user1',
      sourceCloudId: 'cloud2',
      destinationCloudId: 'cloud1',
      sourcePath: '/Photos/2024',
      destinationPath: '/Backup/Photos/2024',
      status: 'completed',
      progressPercentage: 100,
      filesTotal: 1250,
      filesCompleted: 1250,
      filesFailed: 0,
      bytesTotal: 5368709120, // 5GB
      bytesTransferred: 5368709120, // 5GB
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      startedAt: '2024-01-15T08:00:00Z',
      completedAt: '2024-01-15T09:45:00Z',
      createdAt: '2024-01-15T07:55:00Z',
      updatedAt: '2024-01-15T09:45:00Z',
    },
    {
      id: '3',
      userId: 'user1',
      sourceCloudId: 'cloud3',
      destinationCloudId: 'cloud1',
      sourcePath: '/Videos/Tutorials',
      destinationPath: '/Learning/Videos',
      status: 'failed',
      progressPercentage: 25,
      filesTotal: 45,
      filesCompleted: 11,
      filesFailed: 1,
      bytesTotal: 10737418240, // 10GB
      bytesTransferred: 2684354560, // 2.5GB
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      errorMessage: 'Network connection timeout',
      startedAt: '2024-01-15T09:00:00Z',
      createdAt: '2024-01-15T08:55:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '4',
      userId: 'user1',
      sourceCloudId: 'cloud1',
      destinationCloudId: 'cloud3',
      sourcePath: '/Music/Library',
      destinationPath: '/Media/Music',
      status: 'paused',
      progressPercentage: 60,
      filesTotal: 800,
      filesCompleted: 480,
      filesFailed: 0,
      bytesTotal: 3221225472, // 3GB
      bytesTransferred: 1932735283, // 1.8GB
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      startedAt: '2024-01-15T11:00:00Z',
      createdAt: '2024-01-15T10:58:00Z',
      updatedAt: '2024-01-15T11:30:00Z',
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

  const handleAction = async (action: string, transfer: TransferJob) => {
    try {
      switch (action) {
        case 'start':
          await startTransfer(transfer.id).unwrap();
          message.success('전송을 시작했습니다.');
          break;
        case 'pause':
          await pauseTransfer(transfer.id).unwrap();
          message.success('전송을 일시중지했습니다.');
          break;
        case 'resume':
          await resumeTransfer(transfer.id).unwrap();
          message.success('전송을 재개했습니다.');
          break;
        case 'cancel':
          confirm({
            title: '전송 취소',
            content: '정말로 이 전송을 취소하시겠습니까?',
            onOk: async () => {
              await cancelTransfer(transfer.id).unwrap();
              message.success('전송을 취소했습니다.');
            },
          });
          break;
        case 'retry':
          await retryTransfer(transfer.id).unwrap();
          message.success('전송을 다시 시도합니다.');
          break;
        case 'delete':
          confirm({
            title: '전송 기록 삭제',
            content: '이 전송 기록을 삭제하시겠습니까?',
            onOk: async () => {
              await deleteTransfer(transfer.id).unwrap();
              message.success('전송 기록을 삭제했습니다.');
            },
          });
          break;
      }
      refetch();
    } catch (error) {
      message.error('작업 중 오류가 발생했습니다.');
    }
  };

  const getActionButtons = (transfer: TransferJob) => {
    const buttons = [];

    switch (transfer.status) {
      case 'pending':
        buttons.push(
          <Tooltip title="시작">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleAction('start', transfer)}
            />
          </Tooltip>
        );
        break;
      case 'running':
        buttons.push(
          <Tooltip title="일시중지">
            <Button
              type="text"
              icon={<PauseCircleOutlined />}
              onClick={() => handleAction('pause', transfer)}
            />
          </Tooltip>
        );
        break;
      case 'paused':
        buttons.push(
          <Tooltip title="재개">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleAction('resume', transfer)}
            />
          </Tooltip>
        );
        break;
      case 'failed':
        buttons.push(
          <Tooltip title="재시도">
            <Button
              type="text"
              icon={<SyncOutlined />}
              onClick={() => handleAction('retry', transfer)}
            />
          </Tooltip>
        );
        break;
    }

    if (['running', 'paused'].includes(transfer.status)) {
      buttons.push(
        <Tooltip title="취소">
          <Button
            type="text"
            icon={<StopOutlined />}
            onClick={() => handleAction('cancel', transfer)}
            danger
          />
        </Tooltip>
      );
    }

    if (['completed', 'failed', 'cancelled'].includes(transfer.status)) {
      buttons.push(
        <Tooltip title="삭제">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleAction('delete', transfer)}
            danger
          />
        </Tooltip>
      );
    }

    return buttons;
  };

  const getActionMenu = (transfer: TransferJob) => [
    {
      key: 'details',
      icon: <EyeOutlined />,
      label: '자세히 보기',
      onClick: () => message.info('상세 정보 모달이 곧 구현될 예정입니다.'),
    },
    {
      key: 'logs',
      icon: <DownloadOutlined />,
      label: '로그 다운로드',
      onClick: () => message.info('로그 다운로드 기능이 곧 구현될 예정입니다.'),
    },
  ];

  const columns = [
    {
      title: '소스 → 대상',
      key: 'path',
      render: (_, record: TransferJob) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Text strong className="truncate max-w-xs">
              {record.sourcePath}
            </Text>
          </div>
          <div className="text-xs text-gray-500">
            ↓
          </div>
          <div className="flex items-center text-sm">
            <Text className="truncate max-w-xs">
              {record.destinationPath}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: TransferJob) => (
        <div className="space-y-2">
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          {status === 'running' && (
            <ProgressBar
              percentage={record.progressPercentage}
              size="small"
              showPercentage={false}
            />
          )}
          {status === 'failed' && record.errorMessage && (
            <Tooltip title={record.errorMessage}>
              <Text type="danger" className="text-xs truncate block">
                {record.errorMessage}
              </Text>
            </Tooltip>
          )}
        </div>
      ),
      filters: [
        { text: '진행 중', value: 'running' },
        { text: '완료', value: 'completed' },
        { text: '실패', value: 'failed' },
        { text: '일시중지', value: 'paused' },
        { text: '취소됨', value: 'cancelled' },
        { text: '대기 중', value: 'pending' },
      ],
      onFilter: (value: string, record: TransferJob) => record.status === value,
    },
    {
      title: '진행률',
      key: 'progress',
      width: 200,
      render: (_, record: TransferJob) => (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{record.progressPercentage}%</span>
            <span>
              {record.filesCompleted} / {record.filesTotal} 파일
            </span>
          </div>
          <Progress
            percent={record.progressPercentage}
            size="small"
            showInfo={false}
            status={record.status === 'failed' ? 'exception' : 'normal'}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatFileSize(record.bytesTransferred)} / {formatFileSize(record.bytesTotal)}</span>
            {record.status === 'running' && record.transferSpeed > 0 && (
              <span>{formatTransferSpeed(record.transferSpeed)}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '시간',
      key: 'time',
      width: 120,
      render: (_, record: TransferJob) => (
        <div className="space-y-1 text-xs text-gray-500">
          <div>시작: {formatRelativeTime(record.startedAt || record.createdAt)}</div>
          {record.completedAt && (
            <div>완료: {formatRelativeTime(record.completedAt)}</div>
          )}
          {record.status === 'running' && record.estimatedTimeRemaining > 0 && (
            <div>남은 시간: {formatDuration(record.estimatedTimeRemaining)}</div>
          )}
        </div>
      ),
      sorter: (a: TransferJob, b: TransferJob) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, record: TransferJob) => (
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
    total: mockTransfers.length,
    running: mockTransfers.filter(t => t.status === 'running').length,
    completed: mockTransfers.filter(t => t.status === 'completed').length,
    failed: mockTransfers.filter(t => t.status === 'failed').length,
  };

  const rowSelection = {
    selectedRowKeys: selectedRows.map(r => r.id),
    onChange: (selectedRowKeys: React.Key[], selectedRows: TransferJob[]) => {
      setSelectedRows(selectedRows);
    },
  };

  return (
    <div>
      <PageHeader
        title="파일 전송"
        subtitle={
          <Space>
            <span>클라우드 간 파일 전송 작업을 관리하세요</span>
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
                window.location.href = '/transfers/new';
              }}
            >
              새 전송
            </Button>
          </Space>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <StatCard
              title="총 전송"
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
              title="완료됨"
              value={stats.completed}
              icon={<CheckCircleOutlined />}
              variant="success"
            />
          </Col>
          <Col xs={24} sm={6}>
            <StatCard
              title="실패"
              value={stats.failed}
              icon={<ExclamationCircleOutlined />}
              variant="error"
            />
          </Col>
        </Row>

        {/* Filters and Search */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Search
                placeholder="전송 검색..."
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

        {/* Transfer Table */}
        <Card>
          {isLoading ? (
            <LoadingSpinner text="전송 목록을 불러오는 중..." />
          ) : (
            <Table
              columns={columns}
              dataSource={enhancedTransfers}
              rowKey="id"
              rowSelection={rowSelection}
              pagination={{
                total: data?.pagination?.total || enhancedTransfers.length,
                current: pagination.page,
                pageSize: pagination.limit,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} / 총 ${total}개`,
                onChange: (page, pageSize) => {
                  setPagination({ page, limit: pageSize || 20 });
                },
              }}
              scroll={{ x: 800 }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default TransferList;