import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Select,
  Switch,
  Alert,
  Steps,
  message,
  Modal,
  Divider,
} from 'antd';
import {
  CloudOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useConnectProviderMutation, useGetSupportedProvidersQuery } from '../../store';
import { PageHeader } from '../layout/PageHeader';
import { LoadingSpinner } from '../common';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ProviderInfo {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  authType: 'oauth' | 'basic' | 'apikey';
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select';
    required: boolean;
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
    help?: string;
  }>;
  features: string[];
  limitations?: string[];
}

const PROVIDER_INFO: Record<string, ProviderInfo> = {
  pikpak: {
    type: 'pikpak',
    name: 'PikPak',
    description: 'PikPak 클라우드 스토리지 서비스에 연결합니다.',
    icon: <CloudOutlined style={{ color: '#1890ff' }} />,
    authType: 'oauth',
    fields: [
      {
        name: 'alias',
        label: '별칭',
        type: 'text',
        required: true,
        placeholder: '예: My PikPak Account',
        help: '이 연결을 식별하기 위한 이름을 입력하세요.',
      },
    ],
    features: [
      '무제한 저장 공간',
      '빠른 업로드/다운로드',
      '멀티미디어 스트리밍',
      '파일 공유',
    ],
  },
  synology: {
    type: 'synology',
    name: 'Synology NAS',
    description: 'Synology DiskStation Manager에 연결합니다.',
    icon: <CloudOutlined style={{ color: '#ff6600' }} />,
    authType: 'basic',
    fields: [
      {
        name: 'alias',
        label: '별칭',
        type: 'text',
        required: true,
        placeholder: '예: Home NAS',
      },
      {
        name: 'host',
        label: '호스트 주소',
        type: 'url',
        required: true,
        placeholder: 'https://your-nas.example.com:5001',
        help: 'Synology NAS의 QuickConnect ID 또는 직접 주소를 입력하세요.',
      },
      {
        name: 'username',
        label: '사용자명',
        type: 'text',
        required: true,
        placeholder: 'admin',
      },
      {
        name: 'password',
        label: '비밀번호',
        type: 'password',
        required: true,
        placeholder: '비밀번호를 입력하세요',
      },
      {
        name: 'port',
        label: '포트',
        type: 'text',
        required: false,
        placeholder: '5000 (HTTP) 또는 5001 (HTTPS)',
      },
    ],
    features: [
      '로컬 네트워크 액세스',
      '고성능 전송',
      'RAID 보호',
      '스냅샷 지원',
    ],
  },
  webdav: {
    type: 'webdav',
    name: 'WebDAV',
    description: 'WebDAV 프로토콜을 지원하는 서버에 연결합니다.',
    icon: <CloudOutlined style={{ color: '#52c41a' }} />,
    authType: 'basic',
    fields: [
      {
        name: 'alias',
        label: '별칭',
        type: 'text',
        required: true,
        placeholder: '예: Office WebDAV',
      },
      {
        name: 'url',
        label: 'WebDAV URL',
        type: 'url',
        required: true,
        placeholder: 'https://webdav.example.com/remote.php/dav/files/username/',
        help: 'WebDAV 서버의 전체 URL을 입력하세요.',
      },
      {
        name: 'username',
        label: '사용자명',
        type: 'text',
        required: true,
        placeholder: 'username',
      },
      {
        name: 'password',
        label: '비밀번호',
        type: 'password',
        required: true,
        placeholder: '비밀번호 또는 앱 토큰',
      },
    ],
    features: [
      '표준 프로토콜 지원',
      'Nextcloud/ownCloud 호환',
      '인증서 검증',
      '청크 업로드',
    ],
  },
  gdrive: {
    type: 'gdrive',
    name: 'Google Drive',
    description: 'Google Drive 계정에 연결합니다.',
    icon: <CloudOutlined style={{ color: '#4285f4' }} />,
    authType: 'oauth',
    fields: [
      {
        name: 'alias',
        label: '별칭',
        type: 'text',
        required: true,
        placeholder: '예: Personal Google Drive',
      },
    ],
    features: [
      '15GB 무료 저장공간',
      'Google 계정 통합',
      '실시간 협업',
      '버전 기록',
    ],
  },
};

export const ConnectCloudProvider: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [form] = Form.useForm();
  const [connecting, setConnecting] = useState(false);
  
  const { data: supportedProviders = [], isLoading } = useGetSupportedProvidersQuery();
  const [connectProvider] = useConnectProviderMutation();

  const handleProviderSelect = (providerType: string) => {
    setSelectedProvider(providerType);
    setCurrentStep(1);
    form.resetFields();
  };

  const handleConnect = async (values: any) => {
    if (!selectedProvider) return;

    setConnecting(true);
    
    try {
      const providerInfo = PROVIDER_INFO[selectedProvider];
      
      // OAuth 프로바이더인 경우 OAuth 플로우 시뮬레이션
      if (providerInfo.authType === 'oauth') {
        message.loading('OAuth 인증 진행 중...', 0);
        
        // 실제 구현에서는 OAuth 팝업을 열고 인증을 처리합니다
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mockCredentials = {
          type: 'oauth',
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        };

        await connectProvider({
          providerType: selectedProvider,
          credentials: mockCredentials,
          alias: values.alias,
        }).unwrap();
      } else {
        // Basic 또는 API Key 인증
        const credentials = {
          type: 'basic' as const,
          ...values,
        };

        await connectProvider({
          providerType: selectedProvider,
          credentials,
          alias: values.alias,
        }).unwrap();
      }

      message.destroy();
      message.success('클라우드 프로바이더가 성공적으로 연결되었습니다!');
      
      // 연결 완료 후 목록 페이지로 이동
      setTimeout(() => {
        window.location.href = '/clouds';
      }, 1500);
      
    } catch (error) {
      message.destroy();
      message.error('연결에 실패했습니다. 설정을 확인해주세요.');
    } finally {
      setConnecting(false);
    }
  };

  const renderProviderSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Title level={3}>클라우드 프로바이더 선택</Title>
        <Paragraph className="text-gray-600">
          연결하려는 클라우드 스토리지 서비스를 선택하세요.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {Object.values(PROVIDER_INFO).map((provider) => (
          <Col key={provider.type} xs={24} sm={12} lg={8}>
            <Card
              hoverable
              className="h-full transition-all duration-200 hover:shadow-lg cursor-pointer"
              onClick={() => handleProviderSelect(provider.type)}
              cover={
                <div className="flex items-center justify-center py-8 bg-gray-50">
                  <div className="text-4xl">{provider.icon}</div>
                </div>
              }
            >
              <div className="space-y-3">
                <div>
                  <Title level={5} className="!mb-1">
                    {provider.name}
                  </Title>
                  <Text className="text-sm text-gray-600">
                    {provider.description}
                  </Text>
                </div>
                
                <div>
                  <Text className="text-xs text-gray-500 font-medium">주요 기능:</Text>
                  <ul className="text-xs text-gray-600 mt-1 space-y-1">
                    {provider.features.slice(0, 3).map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Alert
        message="지원되는 프로바이더"
        description="현재 PikPak, Synology NAS, WebDAV, Google Drive를 지원합니다. 더 많은 프로바이더가 곧 추가될 예정입니다."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
      />
    </div>
  );

  const renderProviderSetup = () => {
    const providerInfo = PROVIDER_INFO[selectedProvider];
    if (!providerInfo) return null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="text-4xl">{providerInfo.icon}</div>
          </div>
          <Title level={3}>{providerInfo.name} 연결 설정</Title>
          <Paragraph className="text-gray-600">
            {providerInfo.description}
          </Paragraph>
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleConnect}
            className="space-y-4"
          >
            {providerInfo.fields.map((field) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={[{ required: field.required, message: `${field.label}을(를) 입력해주세요.` }]}
                help={field.help}
              >
                {field.type === 'password' ? (
                  <Input.Password placeholder={field.placeholder} />
                ) : field.type === 'select' ? (
                  <Select placeholder={field.placeholder}>
                    {field.options?.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Input placeholder={field.placeholder} />
                )}
              </Form.Item>
            ))}

            <Divider />

            <div className="flex items-center justify-between">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => setCurrentStep(0)}
              >
                이전
              </Button>
              
              <Button
                type="primary"
                htmlType="submit"
                loading={connecting}
                icon={connecting ? <LoadingOutlined /> : <CheckCircleOutlined />}
              >
                {connecting ? '연결 중...' : '연결하기'}
              </Button>
            </div>
          </Form>
        </Card>

        {/* Security Notice */}
        <Alert
          message="보안 정보"
          description="모든 인증 정보는 안전하게 암호화되어 저장됩니다. CloudsLinker는 귀하의 데이터에 직접 액세스하지 않으며, 오직 전송 작업을 위해서만 사용됩니다."
          type="success"
          showIcon
          icon={<SafetyCertificateOutlined />}
        />
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner text="지원되는 프로바이더 목록을 불러오는 중..." />;
  }

  return (
    <div>
      <PageHeader
        title="클라우드 연결"
        subtitle="새로운 클라우드 스토리지 프로바이더를 연결하세요"
        breadcrumbs={[
          { title: '클라우드 관리', path: '/clouds' },
          { title: '클라우드 연결' },
        ]}
      />

      <div className="p-4 sm:p-6">
        {/* Steps */}
        <div className="mb-8">
          <Steps
            current={currentStep}
            className="max-w-md mx-auto"
            items={[
              {
                title: '프로바이더 선택',
                icon: <CloudOutlined />,
              },
              {
                title: '연결 설정',
                icon: connecting ? <LoadingOutlined /> : <CheckCircleOutlined />,
              },
            ]}
          />
        </div>

        {/* Content */}
        {currentStep === 0 ? renderProviderSelection() : renderProviderSetup()}
      </div>
    </div>
  );
};

export default ConnectCloudProvider;