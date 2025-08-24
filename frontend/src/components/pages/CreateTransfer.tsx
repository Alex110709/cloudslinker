import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Steps,
  Row,
  Col,
  Typography,
  Space,
  Alert,
  Divider,
  Switch,
  InputNumber,
  Checkbox,
  message,
  Modal,
} from 'antd';
import {
  CloudOutlined,
  FolderOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useGetCloudProvidersQuery, useCreateTransferJobMutation, useValidateTransferMutation } from '../../store';
import { PageHeader } from '../layout/PageHeader';
import { FileBrowser, LoadingSpinner } from '../common';
import { formatFileSize } from '../../utils';
import type { CloudProvider, FileItem, CreateTransferJobRequest } from '../../types';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

export const CreateTransfer: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [selectedSource, setSelectedSource] = useState<CloudProvider | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<CloudProvider | null>(null);
  const [sourcePath, setSourcePath] = useState('/');
  const [destinationPath, setDestinationPath] = useState('/');
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [estimateData, setEstimateData] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const { data: cloudProviders = [], isLoading } = useGetCloudProvidersQuery();
  const [createTransfer] = useCreateTransferJobMutation();
  const [validateTransfer] = useValidateTransferMutation();

  // Mock cloud providers for development
  const mockProviders: CloudProvider[] = [
    {
      id: '1',
      userId: 'user1',
      providerType: 'pikpak',
      alias: 'My PikPak Account',
      isActive: true,
      lastConnected: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      userId: 'user1',
      providerType: 'synology',
      alias: 'Home NAS',
      isActive: true,
      lastConnected: '2024-01-15T09:45:00Z',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-15T09:45:00Z',
    },
    {
      id: '3',
      userId: 'user1',
      providerType: 'webdav',
      alias: 'Office WebDAV',
      isActive: true,
      lastConnected: '2024-01-15T11:00:00Z',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z',
    },
  ];

  const getProviderIcon = (type: string) => {
    const colors = {
      pikpak: '#1890ff',
      synology: '#ff6600',
      webdav: '#52c41a',
      gdrive: '#4285f4',
    };
    return <CloudOutlined style={{ color: colors[type as keyof typeof colors] || '#1890ff' }} />;
  };

  const getProviderName = (type: string) => {
    const names = {
      pikpak: 'PikPak',
      synology: 'Synology NAS',
      webdav: 'WebDAV',
      gdrive: 'Google Drive',
    };
    return names[type as keyof typeof names] || type.toUpperCase();
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate provider selection
      if (!selectedSource || !selectedDestination) {
        message.error('소스와 대상 클라우드를 모두 선택해주세요.');
        return;
      }
      if (selectedSource.id === selectedDestination.id) {
        message.error('소스와 대상 클라우드가 다르게 선택해주세요.');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleValidateAndEstimate = async () => {
    try {
      const values = await form.validateFields();
      
      const transferRequest: CreateTransferJobRequest = {
        sourceCloudId: selectedSource!.id,
        destinationCloudId: selectedDestination!.id,
        sourcePath,
        destinationPath,
        filters: {
          includePatterns: values.includePatterns?.split(',').map((p: string) => p.trim()).filter(Boolean),
          excludePatterns: values.excludePatterns?.split(',').map((p: string) => p.trim()).filter(Boolean),
          minSize: values.minSize,
          maxSize: values.maxSize,
          fileTypes: values.fileTypes,
        },
        options: {
          overwriteExisting: values.overwriteExisting,
          preserveTimestamps: values.preserveTimestamps,
          verifyIntegrity: values.verifyIntegrity,
          dryRun: values.dryRun,
        },
      };

      // Validate transfer
      const validation = await validateTransfer(transferRequest).unwrap();
      
      if (!validation.valid) {
        Modal.warning({
          title: '전송 설정 검증 실패',
          content: (
            <div>
              {validation.errors?.map((error, index) => (
                <div key={index} className="text-red-500">• {error}</div>
              ))}
              {validation.warnings?.map((warning, index) => (
                <div key={index} className="text-orange-500">• {warning}</div>
              ))}
            </div>
          ),
        });
        return;
      }

      // Get estimate
      message.loading('전송 예상 시간을 계산 중...', 0);
      // Mock estimate data
      setTimeout(() => {
        message.destroy();
        setEstimateData({
          estimatedTime: 1800, // 30 minutes
          estimatedSize: 5368709120, // 5GB
          fileCount: 1250,
        });
        setCurrentStep(currentStep + 1);
      }, 2000);
      
    } catch (error) {
      message.error('설정 검증 중 오류가 발생했습니다.');
    }
  };

  const handleCreateTransfer = async () => {
    try {
      setCreating(true);
      const values = await form.validateFields();
      
      const transferRequest: CreateTransferJobRequest = {
        sourceCloudId: selectedSource!.id,
        destinationCloudId: selectedDestination!.id,
        sourcePath,
        destinationPath,
        filters: {
          includePatterns: values.includePatterns?.split(',').map((p: string) => p.trim()).filter(Boolean),
          excludePatterns: values.excludePatterns?.split(',').map((p: string) => p.trim()).filter(Boolean),
          minSize: values.minSize,
          maxSize: values.maxSize,
          fileTypes: values.fileTypes,
        },
        options: {
          overwriteExisting: values.overwriteExisting,
          preserveTimestamps: values.preserveTimestamps,
          verifyIntegrity: values.verifyIntegrity,
          dryRun: values.dryRun,
        },
      };

      await createTransfer(transferRequest).unwrap();
      
      message.success('전송 작업이 생성되었습니다!');
      
      // Redirect to transfer list
      setTimeout(() => {
        window.location.href = '/transfers';
      }, 1500);
      
    } catch (error) {
      message.error('전송 작업 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const renderProviderSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Title level={4}>클라우드 프로바이더 선택</Title>
        <Paragraph>전송할 소스와 대상 클라우드를 선택하세요.</Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card
            title={
              <div className="flex items-center space-x-2">
                <CloudOutlined />
                <span>소스 클라우드</span>
              </div>
            }
            className="h-full"
          >
            <Select
              placeholder="소스 클라우드 선택"
              value={selectedSource?.id}
              onChange={(value) => {
                const provider = mockProviders.find(p => p.id === value);
                setSelectedSource(provider || null);
              }}
              className="w-full mb-4"
              size="large"
            >
              {mockProviders.map((provider) => (
                <Option key={provider.id} value={provider.id}>
                  <div className="flex items-center space-x-2">
                    {getProviderIcon(provider.providerType)}
                    <span>{provider.alias}</span>
                    <Text type="secondary" className="text-sm">
                      ({getProviderName(provider.providerType)})
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
            
            {selectedSource && (
              <Alert
                message={`선택됨: ${selectedSource.alias}`}
                type="success"
                showIcon
                className="mt-2"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <div className="flex items-center space-x-2">
                <CloudOutlined />
                <span>대상 클라우드</span>
              </div>
            }
            className="h-full"
          >
            <Select
              placeholder="대상 클라우드 선택"
              value={selectedDestination?.id}
              onChange={(value) => {
                const provider = mockProviders.find(p => p.id === value);
                setSelectedDestination(provider || null);
              }}
              className="w-full mb-4"
              size="large"
            >
              {mockProviders
                .filter(p => p.id !== selectedSource?.id)
                .map((provider) => (
                  <Option key={provider.id} value={provider.id}>
                    <div className="flex items-center space-x-2">
                      {getProviderIcon(provider.providerType)}
                      <span>{provider.alias}</span>
                      <Text type="secondary" className="text-sm">
                        ({getProviderName(provider.providerType)})
                      </Text>
                    </div>
                  </Option>
                ))}
            </Select>
            
            {selectedDestination && (
              <Alert
                message={`선택됨: ${selectedDestination.alias}`}
                type="success"
                showIcon
                className="mt-2"
              />
            )}
          </Card>
        </Col>
      </Row>

      <div className="text-center">
        <Button
          type="primary"
          size="large"
          onClick={handleNext}
          disabled={!selectedSource || !selectedDestination}
          icon={<ArrowRightOutlined />}
        >
          다음 단계
        </Button>
      </div>
    </div>
  );

  const renderPathSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Title level={4}>경로 선택</Title>
        <Paragraph>전송할 파일과 폴더의 경로를 선택하세요.</Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderOutlined />
                  <span>소스: {selectedSource?.alias}</span>
                </div>
                <Text type="secondary" className="text-sm">
                  {sourcePath}
                </Text>
              </div>
            }
            className="h-full"
          >
            <FileBrowser
              cloudProviderId={selectedSource!.id}
              cloudProviderName={selectedSource!.alias}
              initialPath={sourcePath}
              selectionMode="multiple"
              onFileSelect={setSelectedFiles}
              onPathChange={setSourcePath}
              height={400}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderOutlined />
                  <span>대상: {selectedDestination?.alias}</span>
                </div>
                <Text type="secondary" className="text-sm">
                  {destinationPath}
                </Text>
              </div>
            }
            className="h-full"
          >
            <FileBrowser
              cloudProviderId={selectedDestination!.id}
              cloudProviderName={selectedDestination!.alias}
              initialPath={destinationPath}
              selectionMode="none"
              onPathChange={setDestinationPath}
              showActions={false}
              height={400}
            />
          </Card>
        </Col>
      </Row>

      {selectedFiles.length > 0 && (
        <Alert
          message={`${selectedFiles.length}개 파일/폴더 선택됨`}
          description={`총 크기: ${formatFileSize(
            selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0)
          )}`}
          type="info"
          showIcon
        />
      )}

      <div className="flex justify-between">
        <Button onClick={handlePrev}>이전</Button>
        <Button type="primary" onClick={handleNext} icon={<ArrowRightOutlined />}>
          다음 단계
        </Button>
      </div>
    </div>
  );

  const renderOptions = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Title level={4}>전송 옵션</Title>
        <Paragraph>전송 작업에 대한 세부 옵션을 설정하세요.</Paragraph>
      </div>

      <Form form={form} layout="vertical" className="max-w-2xl mx-auto">
        <Card title="필터 설정" className="mb-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="includePatterns"
                label="포함할 패턴"
                help="예: *.pdf,*.docx (쉼표로 구분)"
              >
                <Input placeholder="*.pdf,*.jpg,folder*" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="excludePatterns"
                label="제외할 패턴"
                help="예: *.tmp,*cache* (쉼표로 구분)"
              >
                <Input placeholder="*.tmp,*cache*,*.log" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="minSize" label="최소 파일 크기 (바이트)">
                <InputNumber
                  placeholder="1024"
                  className="w-full"
                  formatter={(value) => value ? formatFileSize(Number(value)) : ''}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="maxSize" label="최대 파일 크기 (바이트)">
                <InputNumber
                  placeholder="104857600"
                  className="w-full"
                  formatter={(value) => value ? formatFileSize(Number(value)) : ''}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="전송 옵션">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="overwriteExisting" valuePropName="checked">
                <Checkbox>기존 파일 덮어쓰기</Checkbox>
              </Form.Item>
              <Form.Item name="preserveTimestamps" valuePropName="checked" initialValue={true}>
                <Checkbox>파일 타임스탬프 보존</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="verifyIntegrity" valuePropName="checked" initialValue={true}>
                <Checkbox>파일 무결성 검증</Checkbox>
              </Form.Item>
              <Form.Item name="dryRun" valuePropName="checked">
                <Checkbox>테스트 실행 (실제 전송하지 않음)</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>

      <div className="flex justify-between">
        <Button onClick={handlePrev}>이전</Button>
        <Button
          type="primary"
          onClick={handleValidateAndEstimate}
          icon={<CheckCircleOutlined />}
        >
          검증 및 예상 시간 계산
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Title level={4}>전송 확인</Title>
        <Paragraph>설정을 확인하고 전송을 시작하세요.</Paragraph>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Transfer Summary */}
        <Card title="전송 요약">
          <div className="space-y-4">
            <div className="flex justify-between">
              <Text>소스:</Text>
              <Text strong>{selectedSource?.alias} ({sourcePath})</Text>
            </div>
            <div className="flex justify-between">
              <Text>대상:</Text>
              <Text strong>{selectedDestination?.alias} ({destinationPath})</Text>
            </div>
            <Divider />
            {estimateData && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Text>예상 파일 수:</Text>
                  <Text strong>{estimateData.fileCount.toLocaleString()}개</Text>
                </div>
                <div className="flex justify-between">
                  <Text>예상 크기:</Text>
                  <Text strong>{formatFileSize(estimateData.estimatedSize)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text>예상 소요 시간:</Text>
                  <Text strong>{Math.round(estimateData.estimatedTime / 60)}분</Text>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Options Summary */}
        <Card title="설정 옵션">
          <div className="space-y-2 text-sm">
            <div>✓ 파일 타임스탬프 보존</div>
            <div>✓ 파일 무결성 검증</div>
          </div>
        </Card>

        <Alert
          message="전송 시작 준비 완료"
          description="모든 설정이 완료되었습니다. 전송을 시작하시겠습니까?"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
      </div>

      <div className="flex justify-between">
        <Button onClick={handlePrev}>이전</Button>
        <Button
          type="primary"
          size="large"
          onClick={handleCreateTransfer}
          loading={creating}
          icon={<PlayCircleOutlined />}
        >
          {creating ? '전송 생성 중...' : '전송 시작'}
        </Button>
      </div>
    </div>
  );

  const steps = [
    {
      title: '클라우드 선택',
      icon: <CloudOutlined />,
      content: renderProviderSelection(),
    },
    {
      title: '경로 선택',
      icon: <FolderOutlined />,
      content: renderPathSelection(),
    },
    {
      title: '옵션 설정',
      icon: <SettingOutlined />,
      content: renderOptions(),
    },
    {
      title: '확인 및 시작',
      icon: <CheckCircleOutlined />,
      content: renderConfirmation(),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner text="클라우드 프로바이더 목록을 불러오는 중..." />;
  }

  return (
    <div>
      <PageHeader
        title="새 전송 만들기"
        subtitle="클라우드 간 파일 전송 작업을 설정하세요"
        breadcrumbs={[
          { title: '파일 전송', path: '/transfers' },
          { title: '새 전송 만들기' },
        ]}
      />

      <div className="p-4 sm:p-6">
        {/* Steps */}
        <div className="mb-8">
          <Steps
            current={currentStep}
            items={steps.map((step, index) => ({
              title: step.title,
              icon: step.icon,
              status: currentStep === index ? 'process' : currentStep > index ? 'finish' : 'wait',
            }))}
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Step Content */}
        <div className="min-h-96">
          {steps[currentStep]?.content}
        </div>
      </div>
    </div>
  );
};

export default CreateTransfer;