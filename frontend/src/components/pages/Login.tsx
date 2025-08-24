import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  Alert,
  Space,
  Checkbox,
  message,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  GoogleOutlined,
  GithubOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { useLoginMutation } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';
import type { LoginRequest } from '../../types';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const [login, { isLoading, error }] = useLoginMutation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (values: LoginRequest) => {
    try {
      const result = await login(values).unwrap();
      
      // Store in localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('email', values.email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('email');
      }

      dispatch(loginSuccess(result));
      message.success('로그인되었습니다!');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      message.error(error?.data?.message || '로그인에 실패했습니다.');
    }
  };

  const handleGoogleLogin = () => {
    // Google OAuth login
    message.info('Google 로그인 기능이 곧 구현될 예정입니다.');
  };

  const handleGithubLogin = () => {
    // GitHub OAuth login
    message.info('GitHub 로그인 기능이 곧 구현될 예정입니다.');
  };

  // Auto-fill remembered email
  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberMe');
    const savedEmail = localStorage.getItem('email');
    
    if (remembered === 'true' && savedEmail) {
      form.setFieldsValue({ email: savedEmail });
      setRememberMe(true);
    }
  }, [form]);

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

        {/* Login Card */}
        <Card className="shadow-lg">
          <div className="text-center mb-6">
            <Title level={3} className="m-0">
              로그인
            </Title>
            <Text type="secondary">
              계정에 로그인하여 클라우드를 관리하세요
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="로그인 실패"
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

          {/* Login Form */}
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
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

            <Form.Item
              name="password"
              label="비밀번호"
              rules={[
                { required: true, message: '비밀번호를 입력해주세요' },
                { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-4">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                로그인 정보 기억하기
              </Checkbox>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800">
                비밀번호 찾기
              </Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isLoading}
                className="h-12 text-lg font-medium"
              >
                로그인
              </Button>
            </Form.Item>
          </Form>

          {/* Social Login */}
          <Divider>또는</Divider>
          
          <Space direction="vertical" className="w-full" size="middle">
            <Button
              icon={<GoogleOutlined />}
              onClick={handleGoogleLogin}
              block
              size="large"
              className="h-12"
            >
              Google로 로그인
            </Button>
            
            <Button
              icon={<GithubOutlined />}
              onClick={handleGithubLogin}
              block
              size="large"
              className="h-12"
            >
              GitHub로 로그인
            </Button>
          </Space>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <Text type="secondary">
              계정이 없으신가요?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                회원가입
              </Link>
            </Text>
          </div>
        </Card>

        {/* Demo Account Info */}
        <Card className="shadow-sm bg-blue-50 border-blue-200">
          <div className="text-center">
            <Text type="secondary" className="text-sm">
              <strong>데모 계정:</strong> demo@cloudslinker.com / demo123
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;