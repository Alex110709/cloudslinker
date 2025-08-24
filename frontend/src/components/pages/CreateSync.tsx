import React, { useState } from 'react';
import {
  Card,
  Steps,
  Button,
  Form,
  Select,
  Input,
  Radio,
  Switch,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Alert,
  InputNumber,
  TimePicker,
  Checkbox,
  message,
  Tooltip,
} from 'antd';
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  ScheduleOutlined,
  SyncOutlined,
  SettingOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCreateSyncJobMutation, useGetCloudProvidersQuery } from '../../store';
import { PageHeader } from '../layout/PageHeader';
import { LoadingSpinner } from '../common';
import type { SyncJob, CreateSyncJobRequest } from '../../types';
import dayjs from 'dayjs';

const { Step } = Steps;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Group: CheckboxGroup } = Checkbox;

export const CreateSync: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<CreateSyncJobRequest>>({});

  const { data: cloudProviders, isLoading: loadingProviders } = useGetCloudProvidersQuery();
  const [createSyncJob, { isLoading: creating }] = useCreateSyncJobMutation();

  // Mock cloud providers for development
  const mockCloudProviders = [
    { id: 'cloud1', name: 'PikPak Account', type: 'pikpak', isConnected: true },
    { id: 'cloud2', name: 'My Synology NAS', type: 'synology', isConnected: true },
    { id: 'cloud3', name: 'WebDAV Server', type: 'webdav', isConnected: true },
    { id: 'cloud4', name: 'Backup Drive', type: 'webdav', isConnected: false },
  ];

  const connectedProviders = mockCloudProviders.filter(p => p.isConnected);

  const steps = [
    {
      title: '클라우드 선택',
      description: '소스와 대상 클라우드를 선택하세요',
      icon: <CloudOutlined />,
    },
    {
      title: '경로 설정',
      description: '동기화할 폴더 경로를 설정하세요',
      icon: <SyncOutlined />,
    },
    {
      title: '동기화 옵션',
      description: '동기화 방향과 옵션을 설정하세요',
      icon: <SettingOutlined />,
    },
    {
      title: '스케줄 설정',
      description: '자동 동기화 스케줄을 설정하세요',
      icon: <ScheduleOutlined />,
    },
    {
      title: '확인 및 생성',
      description: '설정을 확인하고 동기화를 생성하세요',
      icon: <CheckOutlined />,
    },
  ];

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      const newFormData = { ...formData, ...values };
      setFormData(newFormData);
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      const finalData = { ...formData, ...values };
      
      console.log('Creating sync job with data:', finalData);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      message.success('동기화 작업이 성공적으로 생성되었습니다!');
      navigate('/sync');
    } catch (error: any) {
      message.error(error?.data?.message || '동기화 작업 생성 중 오류가 발생했습니다.');
    }
  };

  const renderCloudSelection = () => (
    <Card title="클라우드 스토리지 선택" className="w-full">
      <Form.Item
        name="sourceCloudId"
        label="소스 클라우드"
        rules={[{ required: true, message: '소스 클라우드를 선택해주세요' }]}
      >
        <Select
          placeholder="소스 클라우드를 선택하세요"
          size="large"
          showSearch
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {connectedProviders.map(provider => (
            <Option key={provider.id} value={provider.id}>
              <div className="flex items-center justify-between">
                <span>{provider.name}</span>
                <Text type="secondary" className="text-xs">
                  {provider.type.toUpperCase()}
                </Text>
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="destinationCloudId"
        label="대상 클라우드"
        rules={[
          { required: true, message: '대상 클라우드를 선택해주세요' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('sourceCloudId') !== value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('소스와 대상 클라우드는 달라야 합니다'));
            },
          }),
        ]}
      >
        <Select
          placeholder="대상 클라우드를 선택하세요"
          size="large"
          showSearch
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {connectedProviders.map(provider => (
            <Option key={provider.id} value={provider.id}>
              <div className="flex items-center justify-between">
                <span>{provider.name}</span>
                <Text type="secondary" className="text-xs">
                  {provider.type.toUpperCase()}
                </Text>
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Alert
        message="클라우드 연결 확인"
        description="선택한 클라우드 스토리지가 올바르게 연결되어 있는지 확인해주세요. 연결되지 않은 클라우드는 목록에 표시되지 않습니다."
        type="info"
        showIcon
        className="mt-4"
      />
    </Card>
  );

  const renderPathSettings = () => (
    <Card title="동기화 경로 설정" className="w-full">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="sourcePath"
            label="소스 경로"
            rules={[{ required: true, message: '소스 경로를 입력해주세요' }]}
          >
            <Input
              placeholder="/Documents/Work"
              size="large"
              addonBefore="📁"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="destinationPath"
            label="대상 경로"
            rules={[{ required: true, message: '대상 경로를 입력해주세요' }]}
          >
            <Input
              placeholder="/Backup/Work"
              size="large"
              addonBefore="📁"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="설명 (선택사항)">
        <TextArea
          placeholder="이 동기화 작업에 대한 설명을 입력하세요..."
          rows={3}
        />
      </Form.Item>

      <Alert
        message="경로 규칙"
        description={
          <ul className="mt-2 space-y-1">
            <li>• 경로는 '/'로 시작해야 합니다</li>
            <li>• 상대 경로는 지원되지 않습니다</li>
            <li>• 특수 문자는 피해주세요</li>
            <li>• 존재하지 않는 폴더는 자동으로 생성됩니다</li>
          </ul>
        }
        type="info"
        showIcon
      />
    </Card>
  );

  const renderSyncOptions = () => (
    <Card title="동기화 옵션" className="w-full">
      <Form.Item
        name="syncDirection"
        label="동기화 방향"
        rules={[{ required: true, message: '동기화 방향을 선택해주세요' }]}
        initialValue="bidirectional"
      >
        <Radio.Group size="large">
          <Space direction="vertical" className="w-full">
            <Radio value="bidirectional">
              <div className="ml-2">
                <div className="font-medium">양방향 동기화 ⇄</div>
                <div className="text-sm text-gray-500">
                  소스와 대상 모두에서 변경사항을 동기화합니다
                </div>
              </div>
            </Radio>
            <Radio value="source_to_destination">
              <div className="ml-2">
                <div className="font-medium">소스 → 대상 →</div>
                <div className="text-sm text-gray-500">
                  소스의 변경사항만 대상으로 동기화합니다
                </div>
              </div>
            </Radio>
            <Radio value="destination_to_source">
              <div className="ml-2">
                <div className="font-medium">← 대상 → 소스</div>
                <div className="text-sm text-gray-500">
                  대상의 변경사항만 소스로 동기화합니다
                </div>
              </div>
            </Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      <Divider />

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Form.Item
            name={['options', 'conflictResolution']}
            label="충돌 해결 방식"
            initialValue="newest"
          >
            <Select size="large">
              <Option value="newest">최신 파일 우선</Option>
              <Option value="largest">큰 파일 우선</Option>
              <Option value="manual">수동 해결</Option>
              <Option value="skip">건너뛰기</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name={['options', 'deleteOrphaned']}
            label="고아 파일 삭제"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" className="text-sm">
            소스에서 삭제된 파일을 대상에서도 삭제합니다
          </Text>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="mt-4">
        <Col xs={24} md={12}>
          <Form.Item
            name={['options', 'preserveTimestamps']}
            label="타임스탬프 보존"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" className="text-sm">
            파일의 생성/수정 시간을 보존합니다
          </Text>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name={['options', 'skipHidden']}
            label="숨김 파일 제외"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" className="text-sm">
            숨김 파일과 폴더를 동기화에서 제외합니다
          </Text>
        </Col>
      </Row>
    </Card>
  );

  const renderScheduleSettings = () => (
    <Card title="스케줄 설정" className="w-full">
      <Form.Item
        name={['schedule', 'type']}
        label="스케줄 유형"
        rules={[{ required: true, message: '스케줄 유형을 선택해주세요' }]}
        initialValue="manual"
      >
        <Radio.Group size="large">
          <Space direction="vertical" className="w-full">
            <Radio value="manual">
              <div className="ml-2">
                <div className="font-medium">수동 동기화</div>
                <div className="text-sm text-gray-500">
                  필요할 때 수동으로 동기화를 실행합니다
                </div>
              </div>
            </Radio>
            <Radio value="interval">
              <div className="ml-2">
                <div className="font-medium">주기적 동기화</div>
                <div className="text-sm text-gray-500">
                  설정한 시간 간격으로 자동 동기화를 실행합니다
                </div>
              </div>
            </Radio>
            <Radio value="cron">
              <div className="ml-2">
                <div className="font-medium">일정 시간 동기화</div>
                <div className="text-sm text-gray-500">
                  특정 시간에 자동 동기화를 실행합니다
                </div>
              </div>
            </Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
        prevValues.schedule?.type !== currentValues.schedule?.type
      }>
        {({ getFieldValue }) => {
          const scheduleType = getFieldValue(['schedule', 'type']);
          
          if (scheduleType === 'interval') {
            return (
              <Form.Item
                name={['schedule', 'intervalMinutes']}
                label="동기화 간격 (분)"
                rules={[{ required: true, message: '동기화 간격을 입력해주세요' }]}
              >
                <InputNumber
                  min={5}
                  max={10080} // 1 week
                  placeholder="60"
                  addonAfter="분"
                  size="large"
                  className="w-full"
                />
              </Form.Item>
            );
          }
          
          if (scheduleType === 'cron') {
            return (
              <div className="space-y-4">
                <Form.Item
                  name={['schedule', 'cronExpression']}
                  label="Cron 표현식"
                  rules={[{ required: true, message: 'Cron 표현식을 입력해주세요' }]}
                >
                  <Input
                    placeholder="0 2 * * *"
                    size="large"
                    suffix={
                      <Tooltip title="분 시 일 월 요일 형식으로 입력하세요">
                        <InfoCircleOutlined />
                      </Tooltip>
                    }
                  />
                </Form.Item>
                <Alert
                  message="Cron 표현식 예시"
                  description={
                    <ul className="mt-2 space-y-1">
                      <li>• <code>0 2 * * *</code> - 매일 오전 2시</li>
                      <li>• <code>0 */4 * * *</code> - 4시간마다</li>
                      <li>• <code>0 0 * * 0</code> - 매주 일요일 자정</li>
                      <li>• <code>0 0 1 * *</code> - 매월 1일 자정</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                />
              </div>
            );
          }
          
          return null;
        }}
      </Form.Item>

      <Form.Item
        name="isEnabled"
        label="동기화 활성화"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
      <Text type="secondary" className="text-sm">
        동기화 작업을 생성 후 즉시 활성화합니다
      </Text>
    </Card>
  );

  const renderSummary = () => {
    const sourceCloud = connectedProviders.find(p => p.id === formData.sourceCloudId);
    const destinationCloud = connectedProviders.find(p => p.id === formData.destinationCloudId);
    
    return (
      <Card title="동기화 설정 확인" className="w-full">
        <div className="space-y-6">
          <div>
            <Title level={5}>클라우드 설정</Title>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="font-medium">{sourceCloud?.name}</div>
                  <div className="text-sm text-gray-500">{formData.sourcePath}</div>
                </div>
                <div className="text-2xl text-blue-500">
                  {formData.syncDirection === 'bidirectional' ? '⇄' :
                   formData.syncDirection === 'source_to_destination' ? '→' : '←'}
                </div>
                <div className="text-center">
                  <div className="font-medium">{destinationCloud?.name}</div>
                  <div className="text-sm text-gray-500">{formData.destinationPath}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Title level={5}>동기화 옵션</Title>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>방향: {
                formData.syncDirection === 'bidirectional' ? '양방향' :
                formData.syncDirection === 'source_to_destination' ? '소스 → 대상' : '대상 → 소스'
              }</div>
              <div>충돌 해결: {
                formData.options?.conflictResolution === 'newest' ? '최신 파일 우선' :
                formData.options?.conflictResolution === 'largest' ? '큰 파일 우선' :
                formData.options?.conflictResolution === 'manual' ? '수동 해결' : '건너뛰기'
              }</div>
              <div>고아 파일 삭제: {formData.options?.deleteOrphaned ? '예' : '아니오'}</div>
              <div>타임스탬프 보존: {formData.options?.preserveTimestamps ? '예' : '아니오'}</div>
            </div>
          </div>

          <div>
            <Title level={5}>스케줄 설정</Title>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div>유형: {
                formData.schedule?.type === 'manual' ? '수동' :
                formData.schedule?.type === 'interval' ? '주기적' : '일정 시간'
              }</div>
              {formData.schedule?.type === 'interval' && (
                <div>간격: {formData.schedule.intervalMinutes}분마다</div>
              )}
              {formData.schedule?.type === 'cron' && (
                <div>Cron: {formData.schedule.cronExpression}</div>
              )}
              <div>활성화: {formData.isEnabled ? '예' : '아니오'}</div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderCloudSelection();
      case 1:
        return renderPathSettings();
      case 2:
        return renderSyncOptions();
      case 3:
        return renderScheduleSettings();
      case 4:
        return renderSummary();
      default:
        return null;
    }
  };

  if (loadingProviders) {
    return <LoadingSpinner text="클라우드 프로바이더를 불러오는 중..." />;
  }

  return (
    <div>
      <PageHeader
        title="새 동기화 작업"
        subtitle="클라우드 간 자동 동기화 작업을 생성하세요"
        breadcrumbs={[
          { title: '동기화', path: '/sync' },
          { title: '새 동기화' },
        ]}
      />

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <Steps current={currentStep} className="mb-8">
              {steps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                />
              ))}
            </Steps>
          </Card>

          <Form
            form={form}
            layout="vertical"
            initialValues={formData}
            onFinish={handleFinish}
          >
            {renderStepContent()}

            <div className="mt-8 flex justify-between">
              <Button
                size="large"
                onClick={handlePrev}
                disabled={currentStep === 0}
                icon={<ArrowLeftOutlined />}
              >
                이전
              </Button>

              <Space>
                <Button
                  size="large"
                  onClick={() => navigate('/sync')}
                >
                  취소
                </Button>
                
                {currentStep < steps.length - 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleNext}
                    icon={<ArrowRightOutlined />}
                    iconPosition="end"
                  >
                    다음
                  </Button>
                )}
                
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleFinish}
                    loading={creating}
                    icon={<CheckOutlined />}
                  >
                    동기화 생성
                  </Button>
                )}
              </Space>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default CreateSync;