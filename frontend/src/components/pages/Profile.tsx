import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  Typography,
  Row,
  Col,
  Divider,
  Space,
  message,
  Modal,
  Select,
  Switch,
  Tag,
  Descriptions,
  Progress,
  Alert,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CameraOutlined,
  LockOutlined,
  SettingOutlined,
  CrownOutlined,
  CalendarOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { useUpdateProfileMutation, useChangePasswordMutation, useUploadAvatarMutation } from '../../store';
import { PageHeader } from '../layout/PageHeader';
import { formatRelativeTime, formatFileSize } from '../../utils';
import type { UpdateProfileRequest, ChangePasswordRequest } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const Profile: React.FC = () => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  
  const user = useAppSelector(selectUser);
  
  const [updateProfile, { isLoading: updatingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation();
  const [uploadAvatar, { isLoading: uploadingAvatar }] = useUploadAvatarMutation();

  // Mock user data for development
  const mockUser = {
    id: 'user1',
    email: 'demo@cloudslinker.com',
    firstName: '데모',
    lastName: '사용자',
    avatar: null,
    phone: '+82-10-1234-5678',
    address: '서울특별시 강남구',
    bio: '클라우드 스토리지 관리를 좋아하는 개발자입니다.',
    subscriptionTier: 'pro',
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    language: 'ko',
    timezone: 'Asia/Seoul',
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    usage: {
      storageUsed: 42949672960, // 40GB
      storageLimit: 107374182400, // 100GB
      transfersThisMonth: 1250,
      transferLimit: 5000,
      syncsActive: 8,
      syncLimit: 20,
    },
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-15T10:30:00Z',
  };

  const handleProfileUpdate = async (values: UpdateProfileRequest) => {
    try {
      await updateProfile(values).unwrap();
      message.success('프로필이 성공적으로 업데이트되었습니다.');
    } catch (error: any) {
      message.error(error?.data?.message || '프로필 업데이트에 실패했습니다.');
    }
  };

  const handlePasswordChange = async (values: ChangePasswordRequest) => {
    try {
      await changePassword(values).unwrap();
      message.success('비밀번호가 성공적으로 변경되었습니다.');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.message || '비밀번호 변경에 실패했습니다.');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await uploadAvatar(formData).unwrap();
      message.success('프로필 사진이 성공적으로 변경되었습니다.');
    } catch (error: any) {
      message.error(error?.data?.message || '프로필 사진 업로드에 실패했습니다.');
    }
    return false; // Prevent default upload behavior
  };

  const getSubscriptionTierInfo = (tier: string) => {
    switch (tier) {
      case 'free':
        return { color: 'default', text: '무료' };
      case 'pro':
        return { color: 'blue', text: '프로' };
      case 'enterprise':
        return { color: 'gold', text: '엔터프라이즈' };
      default:
        return { color: 'default', text: tier };
    }
  };

  const tierInfo = getSubscriptionTierInfo(mockUser.subscriptionTier);

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar and Basic Info */}
      <Card title="기본 정보">
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={8} className="text-center">
            <div className="space-y-4">
              <Avatar
                size={120}
                src={mockUser.avatar}
                icon={<UserOutlined />}
                className="shadow-lg"
              />
              <Upload
                showUploadList={false}
                beforeUpload={handleAvatarUpload}
                accept="image/*"
              >
                <Button
                  icon={<CameraOutlined />}
                  loading={uploadingAvatar}
                  size="small"
                >
                  사진 변경
                </Button>
              </Upload>
            </div>
          </Col>
          
          <Col xs={24} sm={16}>
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileUpdate}
              initialValues={mockUser}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="firstName"
                    label="이름"
                    rules={[{ required: true, message: '이름을 입력해주세요' }]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="lastName"
                    label="성"
                    rules={[{ required: true, message: '성을 입력해주세요' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="email"
                label="이메일"
                rules={[
                  { required: true, message: '이메일을 입력해주세요' },
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  disabled
                  suffix={
                    mockUser.emailVerified ? (
                      <Tag color="green" size="small">인증됨</Tag>
                    ) : (
                      <Tag color="orange" size="small">미인증</Tag>
                    )
                  }
                />
              </Form.Item>

              <Form.Item name="phone" label="전화번호">
                <Input
                  prefix={<PhoneOutlined />}
                  suffix={
                    mockUser.phoneVerified ? (
                      <Tag color="green" size="small">인증됨</Tag>
                    ) : (
                      <Tag color="orange" size="small">미인증</Tag>
                    )
                  }
                />
              </Form.Item>

              <Form.Item name="address" label="주소">
                <Input prefix={<EnvironmentOutlined />} />
              </Form.Item>

              <Form.Item name="bio" label="소개">
                <TextArea rows={3} placeholder="자신을 소개해주세요..." />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={updatingProfile}
                  >
                    프로필 저장
                  </Button>
                  <Button
                    icon={<LockOutlined />}
                    onClick={() => setPasswordModalVisible(true)}
                  >
                    비밀번호 변경
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>

      {/* Account Information */}
      <Card title="계정 정보">
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="구독 플랜">
            <Space>
              <Tag color={tierInfo.color} icon={<CrownOutlined />}>
                {tierInfo.text}
              </Tag>
              <Button type="link" size="small">
                플랜 변경
              </Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="계정 상태">
            <Tag color={mockUser.isActive ? 'green' : 'red'}>
              {mockUser.isActive ? '활성' : '비활성'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="가입일">
            <Space>
              <CalendarOutlined />
              {formatRelativeTime(mockUser.createdAt)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="마지막 로그인">
            <Space>
              <TeamOutlined />
              {formatRelativeTime(mockUser.lastLoginAt)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="2단계 인증">
            <Switch
              checked={mockUser.twoFactorEnabled}
              onChange={(checked) => {
                message.info(`2단계 인증이 ${checked ? '활성화' : '비활성화'}되었습니다.`);
              }}
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderUsageTab = () => (
    <div className="space-y-6">
      {/* Storage Usage */}
      <Card title="스토리지 사용량">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text>스토리지 사용량</Text>
              <Text strong>
                {formatFileSize(mockUser.usage.storageUsed)} / {formatFileSize(mockUser.usage.storageLimit)}
              </Text>
            </div>
            <Progress
              percent={Math.round((mockUser.usage.storageUsed / mockUser.usage.storageLimit) * 100)}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
          
          <Alert
            message="스토리지 용량 안내"
            description={`현재 ${Math.round((mockUser.usage.storageUsed / mockUser.usage.storageLimit) * 100)}%의 스토리지를 사용 중입니다. 용량이 부족할 경우 플랜 업그레이드를 고려해보세요.`}
            type="info"
            showIcon
          />
        </div>
      </Card>

      {/* Transfer Usage */}
      <Card title="전송 사용량">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text>이번 달 전송 횟수</Text>
              <Text strong>
                {mockUser.usage.transfersThisMonth} / {mockUser.usage.transferLimit}
              </Text>
            </div>
            <Progress
              percent={Math.round((mockUser.usage.transfersThisMonth / mockUser.usage.transferLimit) * 100)}
              strokeColor={{
                '0%': '#722ed1',
                '100%': '#52c41a',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Sync Usage */}
      <Card title="동기화 사용량">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text>활성 동기화 작업</Text>
              <Text strong>
                {mockUser.usage.syncsActive} / {mockUser.usage.syncLimit}
              </Text>
            </div>
            <Progress
              percent={Math.round((mockUser.usage.syncsActive / mockUser.usage.syncLimit) * 100)}
              strokeColor={{
                '0%': '#fa8c16',
                '100%': '#f5222d',
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Language and Region */}
      <Card title="언어 및 지역">
        <Form layout="vertical" initialValues={mockUser}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="language" label="언어">
                <Select>
                  <Option value="ko">한국어</Option>
                  <Option value="en">English</Option>
                  <Option value="ja">日本語</Option>
                  <Option value="zh">中文</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="timezone" label="시간대">
                <Select>
                  <Option value="Asia/Seoul">서울 (UTC+9)</Option>
                  <Option value="America/New_York">뉴욕 (UTC-5)</Option>
                  <Option value="Europe/London">런던 (UTC+0)</Option>
                  <Option value="Asia/Tokyo">도쿄 (UTC+9)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Notification Settings */}
      <Card title="알림 설정">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <Text strong>이메일 알림</Text>
              <div className="text-sm text-gray-500">
                전송 완료, 오류 등의 알림을 이메일로 받습니다
              </div>
            </div>
            <Switch defaultChecked={mockUser.notifications.email} />
          </div>
          
          <Divider />
          
          <div className="flex justify-between items-center">
            <div>
              <Text strong>푸시 알림</Text>
              <div className="text-sm text-gray-500">
                브라우저 푸시 알림을 받습니다
              </div>
            </div>
            <Switch defaultChecked={mockUser.notifications.push} />
          </div>
          
          <Divider />
          
          <div className="flex justify-between items-center">
            <div>
              <Text strong>SMS 알림</Text>
              <div className="text-sm text-gray-500">
                중요한 알림을 SMS로 받습니다
              </div>
            </div>
            <Switch defaultChecked={mockUser.notifications.sms} />
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="프로필"
        subtitle="계정 정보와 설정을 관리하세요"
        breadcrumbs={[
          { title: '설정', path: '/settings' },
          { title: '프로필' },
        ]}
      />

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-6">
            <div className="flex items-center space-x-4">
              <Avatar
                size={80}
                src={mockUser.avatar}
                icon={<UserOutlined />}
              />
              <div className="flex-1">
                <Title level={3} className="m-0">
                  {mockUser.firstName} {mockUser.lastName}
                </Title>
                <Text type="secondary" className="block">
                  {mockUser.email}
                </Text>
                <Space className="mt-2">
                  <Tag color={tierInfo.color} icon={<CrownOutlined />}>
                    {tierInfo.text} 플랜
                  </Tag>
                  {mockUser.emailVerified && (
                    <Tag color="green">이메일 인증됨</Tag>
                  )}
                </Space>
              </div>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              type={activeTab === 'profile' ? 'primary' : 'default'}
              onClick={() => setActiveTab('profile')}
            >
              프로필 정보
            </Button>
            <Button
              type={activeTab === 'usage' ? 'primary' : 'default'}
              onClick={() => setActiveTab('usage')}
            >
              사용량
            </Button>
            <Button
              type={activeTab === 'settings' ? 'primary' : 'default'}
              onClick={() => setActiveTab('settings')}
            >
              설정
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'usage' && renderUsageTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        title="비밀번호 변경"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            name="currentPassword"
            label="현재 비밀번호"
            rules={[{ required: true, message: '현재 비밀번호를 입력해주세요' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="새 비밀번호"
            rules={[
              { required: true, message: '새 비밀번호를 입력해주세요' },
              { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="비밀번호 확인"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '비밀번호를 다시 입력해주세요' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setPasswordModalVisible(false)}>
                취소
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={changingPassword}
              >
                변경
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;