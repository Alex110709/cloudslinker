import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Checkbox,
  Select,
  Progress,
  message,
  Space,
  Divider,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../../store';
import type { RegisterRequest } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

export const Register: React.FC = () => {
  const [form] = Form.useForm();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  
  const [register, { isLoading, error }] = useRegisterMutation();

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 40) return '#ff4d4f';
    if (strength < 60) return '#faad14';
    if (strength < 80) return '#1890ff';
    return '#52c41a';
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 40) return '약함';
    if (strength < 60) return '보통';
    if (strength < 80) return '강함';
    return '매우 강함';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    const strength = calculatePasswordStrength(password);
    setPasswordStrength(strength);
  };

  const handleRegister = async (values: RegisterRequest) => {
    try {
      await register(values).unwrap();
      message.success('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      navigate('/login');
    } catch (error: any) {
      console.error('Registration failed:', error);
      message.error(error?.data?.message || '회원가입에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CloudOutlined className="text-4xl text-blue-600 mr-2" />
            <Title level={2} className="m-0">
              CloudsLinker
            </Title>
          </div>
          <Text className="text-gray-600">
            클라우드 스토리지 통합 관리 플랫폼
          </Text>
        </div>

        {/* Register Card */}
        <Card className="shadow-lg">
          <div className="text-center mb-6">
            <Title level={3} className="m-0">
              회원가입
            </Title>
            <Text type="secondary">
              새 계정을 만들어 클라우드 관리를 시작하세요
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="회원가입 실패"
              description={
                'data' in error 
                  ? (error.data as any)?.message || '알 수 없는 오류가 발생했습니다.'
                  : '네트워크 오류가 발생했습니다.'
              }
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          {/* Register Form */}
          <Form
            form={form}
            name="register"
            onFinish={handleRegister}
            layout="vertical"
            size="large"
          >
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
                placeholder="이메일을 입력하세요"
                autoComplete="email"
              />
            </Form.Item>

            <Space.Compact className="w-full">
              <Form.Item
                name="firstName"
                label="이름"
                className="flex-1 mr-2"
                rules={[
                  { required: true, message: '이름을 입력해주세요' },
                  { min: 2, message: '이름은 최소 2자 이상이어야 합니다' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="이름"
                  autoComplete="given-name"
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="성"
                className="flex-1"
                rules={[
                  { required: true, message: '성을 입력해주세요' },
                  { min: 1, message: '성을 입력해주세요' },
                ]}
              >
                <Input
                  placeholder="성"
                  autoComplete="family-name"
                />
              </Form.Item>
            </Space.Compact>

            <Form.Item
              name="password"
              label="비밀번호"
              rules={[
                { required: true, message: '비밀번호를 입력해주세요' },
                { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
                {
                  validator: (_, value) => {
                    if (!value || calculatePasswordStrength(value) >= 40) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('더 강한 비밀번호를 사용해주세요'));
                  },
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호를 입력하세요"
                onChange={handlePasswordChange}
                autoComplete="new-password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            {/* Password Strength Indicator */}
            {form.getFieldValue('password') && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <Text className="text-sm">비밀번호 강도:</Text>
                  <Text 
                    className="text-sm font-medium"
                    style={{ color: getPasswordStrengthColor(passwordStrength) }}
                  >
                    {getPasswordStrengthText(passwordStrength)}
                  </Text>
                </div>
                <Progress
                  percent={passwordStrength}
                  strokeColor={getPasswordStrengthColor(passwordStrength)}
                  showInfo={false}
                  size="small"
                />
              </div>
            )}

            <Form.Item
              name="confirmPassword"
              label="비밀번호 확인"
              dependencies={['password']}
              rules={[
                { required: true, message: '비밀번호를 다시 입력해주세요' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('비밀번호가 일치하지 않습니다'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              name="subscriptionTier"
              label="구독 플랜"
              initialValue="free"
              rules={[{ required: true, message: '구독 플랜을 선택해주세요' }]}
            >
              <Select placeholder="구독 플랜을 선택하세요">
                <Option value="free">
                  <div>
                    <div className="font-medium">무료 플랜</div>
                    <div className="text-xs text-gray-500">기본 기능 이용 가능</div>
                  </div>
                </Option>
                <Option value="pro">
                  <div>
                    <div className="font-medium">프로 플랜</div>
                    <div className="text-xs text-gray-500">고급 기능 및 무제한 전송</div>
                  </div>
                </Option>
                <Option value="enterprise">
                  <div>
                    <div className="font-medium">엔터프라이즈 플랜</div>
                    <div className="text-xs text-gray-500">기업용 고급 기능</div>
                  </div>
                </Option>
              </Select>
            </Form.Item>

            {/* Terms and Privacy */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <Checkbox
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mr-2 mt-1"
                />
                <Text className="text-sm">
                  <Link to="/terms" target="_blank" className="text-blue-600 hover:text-blue-800">
                    이용약관
                  </Link>
                  에 동의합니다 (필수)
                </Text>
              </div>
              
              <div className="flex items-start">
                <Checkbox
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mr-2 mt-1"
                />
                <Text className="text-sm">
                  <Link to="/privacy" target="_blank" className="text-blue-600 hover:text-blue-800">
                    개인정보처리방침
                  </Link>
                  에 동의합니다 (필수)
                </Text>
              </div>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isLoading}
                disabled={!acceptTerms || !acceptPrivacy}
                className="h-12 text-lg font-medium"
              >
                계정 만들기
              </Button>
            </Form.Item>
          </Form>

          {/* Login Link */}
          <div className="text-center">
            <Text type="secondary">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                로그인
              </Link>
            </Text>
          </div>
        </Card>

        {/* Features */}
        <Card className="shadow-sm bg-green-50 border-green-200">
          <div className="text-center space-y-2">
            <Text className="text-sm font-medium text-green-800">
              CloudsLinker의 주요 기능
            </Text>
            <div className="grid grid-cols-1 gap-1 text-xs text-green-700">
              <div className="flex items-center justify-center">
                <CheckCircleOutlined className="mr-1" />
                다중 클라우드 스토리지 통합 관리
              </div>
              <div className="flex items-center justify-center">
                <CheckCircleOutlined className="mr-1" />
                제로 대역폭 클라우드 간 직접 전송
              </div>
              <div className="flex items-center justify-center">
                <CheckCircleOutlined className="mr-1" />
                자동 동기화 및 스케줄링
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;