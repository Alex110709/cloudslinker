import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Breadcrumb,
  Typography,
  Input,
  Dropdown,
  Modal,
  message,
  Tag,
  Tooltip,
  Row,
  Col,
  Select,
} from 'antd';
import {
  FolderOutlined,
  SearchOutlined,
  MoreOutlined,
  DownloadOutlined,
  DeleteOutlined,
  CopyOutlined,
  ScissorOutlined,
  EyeOutlined,
  CloudOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useBrowseFilesQuery } from '../../store';
import { FileIcon, LoadingSpinner } from '../common';
import { formatFileSize, formatRelativeTime, getFileCategory } from '../../utils';
import type { FileItem, FileFilter } from '../../types';

const { Search } = Input;
const { Text } = Typography;
const { Option } = Select;

interface FileBrowserProps {
  cloudProviderId: string;
  cloudProviderName: string;
  initialPath?: string;
  selectionMode?: 'single' | 'multiple' | 'none';
  onFileSelect?: (files: FileItem[]) => void;
  onPathChange?: (path: string) => void;
  showActions?: boolean;
  height?: number;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  cloudProviderId,
  cloudProviderName,
  initialPath = '/',
  selectionMode = 'multiple',
  onFileSelect,
  onPathChange,
  showActions = true,
  height,
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<FileFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: files = [], isLoading, refetch } = useBrowseFilesQuery({
    providerId: cloudProviderId,
    path: currentPath,
    filters: {
      ...filters,
      ...(searchText && { includePatterns: [`*${searchText}*`] }),
    },
  });

  useEffect(() => {
    onPathChange?.(currentPath);
  }, [currentPath, onPathChange]);

  useEffect(() => {
    onFileSelect?.(selectedFiles);
  }, [selectedFiles, onFileSelect]);

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === 'folder') {
      const newPath = folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`;
      setCurrentPath(newPath);
      setSelectedFiles([]);
    }
  };

  const handleGoBack = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
    setSelectedFiles([]);
  };

  const handlePathClick = (index: number, pathParts: string[]) => {
    const newPath = index === 0 ? '/' : '/' + pathParts.slice(1, index + 1).join('/');
    setCurrentPath(newPath);
    setSelectedFiles([]);
  };

  const getRowSelection = () => {
    if (selectionMode === 'none') return undefined;

    return {
      type: selectionMode === 'single' ? 'radio' : 'checkbox',
      selectedRowKeys: selectedFiles.map(f => f.id),
      onChange: (selectedRowKeys: React.Key[], selectedRows: FileItem[]) => {
        setSelectedFiles(selectedRows);
      },
      getCheckboxProps: (record: FileItem) => ({
        disabled: false,
      }),
    };
  };

  const getActionMenu = (file: FileItem) => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '미리보기',
      onClick: () => message.info('미리보기 기능이 곧 구현될 예정입니다.'),
    },
    {
      key: 'download',
      icon: <DownloadOutlined />,
      label: '다운로드',
      onClick: () => message.info('다운로드 기능이 곧 구현될 예정입니다.'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '복사',
      onClick: () => message.info('복사 기능이 곧 구현될 예정입니다.'),
    },
    {
      key: 'cut',
      icon: <ScissorOutlined />,
      label: '잘라내기',
      onClick: () => message.info('잘라내기 기능이 곧 구현될 예정입니다.'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '삭제',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '파일 삭제',
          content: `"${file.name}"을(를) 삭제하시겠습니까?`,
          okText: '삭제',
          okType: 'danger',
          cancelText: '취소',
          onOk: () => {
            message.info('삭제 기능이 곧 구현될 예정입니다.');
          },
        });
      },
    },
  ];

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileItem) => (
        <div className="flex items-center space-x-2 min-w-0">
          <FileIcon fileName={name} fileType={record.type} size={20} />
          <Text
            className={`truncate ${record.type === 'folder' ? 'cursor-pointer hover:text-blue-600' : ''}`}
            onClick={() => record.type === 'folder' && handleFolderClick(record)}
          >
            {name}
          </Text>
          {record.isShared && <Tag color="blue" size="small">공유됨</Tag>}
        </div>
      ),
      sorter: (a: FileItem, b: FileItem) => a.name.localeCompare(b.name),
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number, record: FileItem) => (
        <Text className="text-sm text-gray-600">
          {record.type === 'folder' ? '-' : formatFileSize(size)}
        </Text>
      ),
      sorter: (a: FileItem, b: FileItem) => (a.size || 0) - (b.size || 0),
    },
    {
      title: '유형',
      key: 'type',
      width: 100,
      render: (_, record: FileItem) => {
        if (record.type === 'folder') {
          return <Tag icon={<FolderOutlined />}>폴더</Tag>;
        }
        const category = getFileCategory(record.name);
        const categoryColors = {
          image: 'green',
          video: 'blue',
          audio: 'purple',
          document: 'orange',
          archive: 'red',
          other: 'default',
        };
        return (
          <Tag color={categoryColors[category]}>
            {category === 'other' ? '파일' : category}
          </Tag>
        );
      },
      filters: [
        { text: '폴더', value: 'folder' },
        { text: '이미지', value: 'image' },
        { text: '동영상', value: 'video' },
        { text: '음악', value: 'audio' },
        { text: '문서', value: 'document' },
        { text: '압축파일', value: 'archive' },
        { text: '기타', value: 'other' },
      ],
      onFilter: (value: string, record: FileItem) => {
        if (value === 'folder') return record.type === 'folder';
        return getFileCategory(record.name) === value;
      },
    },
    {
      title: '수정일',
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      width: 150,
      render: (modifiedAt: string) => (
        <Text className="text-sm text-gray-600">
          {modifiedAt ? formatRelativeTime(modifiedAt) : '-'}
        </Text>
      ),
      sorter: (a: FileItem, b: FileItem) => {
        if (!a.modifiedAt || !b.modifiedAt) return 0;
        return new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      },
    },
    ...(showActions ? [{
      title: '작업',
      key: 'actions',
      width: 80,
      render: (_, record: FileItem) => (
        <Dropdown
          menu={{ items: getActionMenu(record) }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    }] : []),
  ];

  const pathParts = currentPath.split('/').filter(part => part);

  const renderBreadcrumb = () => (
    <Breadcrumb className="mb-4">
      <Breadcrumb.Item>
        <Button
          type="text"
          icon={<CloudOutlined />}
          onClick={() => handlePathClick(0, pathParts)}
          className="px-0"
        >
          {cloudProviderName}
        </Button>
      </Breadcrumb.Item>
      {pathParts.map((part, index) => (
        <Breadcrumb.Item key={index}>
          <Button
            type="text"
            onClick={() => handlePathClick(index + 1, pathParts)}
            className="px-0"
          >
            {part}
          </Button>
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  );

  const renderToolbar = () => (
    <div className="flex items-center justify-between mb-4 gap-4">
      <div className="flex items-center space-x-2">
        <Button
          icon={<ArrowLeftOutlined />}
          disabled={currentPath === '/'}
          onClick={handleGoBack}
        >
          뒤로
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          새로고침
        </Button>
      </div>

      <div className="flex items-center space-x-2 flex-1 max-w-md">
        <Search
          placeholder="파일 및 폴더 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={() => refetch()}
          allowClear
        />
        <Tooltip title="필터">
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters ? 'primary' : 'default'}
          />
        </Tooltip>
      </div>
    </div>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Card size="small" className="mb-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Text className="block mb-2 text-sm font-medium">파일 크기</Text>
            <Select
              placeholder="크기 범위 선택"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => {
                if (value) {
                  const [min, max] = value.split('-').map(Number);
                  setFilters(prev => ({ ...prev, minSize: min, maxSize: max }));
                } else {
                  const { minSize, maxSize, ...rest } = filters;
                  setFilters(rest);
                }
              }}
            >
              <Option value="0-1048576">1MB 미만</Option>
              <Option value="1048576-10485760">1MB - 10MB</Option>
              <Option value="10485760-104857600">10MB - 100MB</Option>
              <Option value="104857600-1073741824">100MB - 1GB</Option>
              <Option value="1073741824-">1GB 이상</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Text className="block mb-2 text-sm font-medium">수정일</Text>
            <Select
              placeholder="기간 선택"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => {
                if (value) {
                  const date = new Date();
                  date.setDate(date.getDate() - Number(value));
                  setFilters(prev => ({ ...prev, modifiedAfter: date.toISOString() }));
                } else {
                  const { modifiedAfter, ...rest } = filters;
                  setFilters(rest);
                }
              }}
            >
              <Option value="1">1일 이내</Option>
              <Option value="7">1주 이내</Option>
              <Option value="30">1개월 이내</Option>
              <Option value="90">3개월 이내</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Text className="block mb-2 text-sm font-medium">파일 형식</Text>
            <Select
              placeholder="형식 선택"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => {
                if (value) {
                  setFilters(prev => ({ ...prev, fileTypes: [value] }));
                } else {
                  const { fileTypes, ...rest } = filters;
                  setFilters(rest);
                }
              }}
            >
              <Option value="pdf">PDF</Option>
              <Option value="jpg,jpeg,png,gif">이미지</Option>
              <Option value="mp4,avi,mov">동영상</Option>
              <Option value="mp3,wav,flac">음악</Option>
              <Option value="doc,docx,xls,xlsx">문서</Option>
            </Select>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderSelectedInfo = () => {
    if (selectedFiles.length === 0) return null;

    const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center justify-between">
          <Text>
            <strong>{selectedFiles.length}개</strong> 항목 선택됨
            {totalSize > 0 && ` (총 ${formatFileSize(totalSize)})`}
          </Text>
          <Space>
            <Button size="small" onClick={() => setSelectedFiles([])}>
              선택 해제
            </Button>
            <Button size="small" type="primary">
              선택된 항목으로 작업
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner text="파일 목록을 불러오는 중..." />;
  }

  return (
    <div>
      {renderBreadcrumb()}
      {renderToolbar()}
      {renderFilters()}
      {renderSelectedInfo()}
      
      <Table
        columns={columns}
        dataSource={files}
        rowKey="id"
        rowSelection={getRowSelection()}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} / 총 ${total}개`,
          pageSizeOptions: ['20', '50', '100'],
          defaultPageSize: 20,
        }}
        scroll={{ y: height }}
        size="small"
        className="border border-gray-200 rounded"
      />
    </div>
  );
};

export default FileBrowser;