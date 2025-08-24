import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Result,
  Steps,
  message,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  CloudOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForgotPasswordMutation, useResetPasswordMutation } from '../../store';

const { Title, Text } = Typography;
const { Step } = Steps;

export const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [forgotPassword, { isLoading: sendingEmail }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const token = searchParams.get('token');

  // If token exists in URL, show reset password form
  React.useEffect(() => {
    if (token) {
      setCurrentStep(2);
    }
  }, [token]);

  const handleForgotPassword = async (values: { email: string }) => {
    try {
      await forgotPassword(values).unwrap();
      setEmail(values.email);
      setCurrentStep(1);
      message.success('비밀번호 재설정 이메일이 발송되었습니다.');
    } catch (error: any) {
      console.error('Forgot password failed:', error);
      message.error(error?.data?.message || '이메일 발송에 실패했습니다.');
    }
  };

  const handleResetPassword = async (values: { password: string; confirmPassword: string }) => {
    try {
      await resetPassword({
        token: token!,
        password: values.password,
      }).unwrap();
      setCurrentStep(3);
      message.success('비밀번호가 성공적으로 변경되었습니다.');
    } catch (error: any) {
      console.error('Reset password failed:', error);
      message.error(error?.data?.message || '비밀번호 재설정에 실패했습니다.');
    }
  };

  const steps = [
    {
      title: '이메일 입력',
      description: '등록된 이메일 주소를 입력하세요',
    },
    {
      title: '이메일 확인',
      description: '발송된 이메일을 확인하세요',
    },
    {
      title: '비밀번호 재설정',
      description: '새로운 비밀번호를 입력하세요',
    },
    {
      title: '완료',
      description: '비밀번호가 성공적으로 변경되었습니다',
    },
  ];

  const renderEmailStep = () => (
    <Form
      form={form}
      name="forgot-password"
      onFinish={handleForgotPassword}
      layout="vertical"
      size="large"
    >
      <div className="text-center mb-6">
        <Title level={4}>이메일 주소 입력</Title>
        <Text type="secondary">
          등록하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
        </Text>
      </div>

      <Form.Item
        name="email"
        label="이메일 주소"
        rules={[
          { required: true, message: '이메일을 입력해주세요' },
          { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="등록된 이메일을 입력하세요"
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={sendingEmail}
          className="h-12 text-lg font-medium"
        >
          재설정 링크 보내기
        </Button>
      </Form.Item>
    </Form>
  );

  const renderEmailSentStep = () => (
    <div className="text-center space-y-4">
      <div className="text-6xl text-blue-500 mb-4">
        <MailOutlined />
      </div>
      <Title level={4}>이메일을 확인해주세요</Title>
      <div className="space-y-2">
        <Text type="secondary" className="block">
          <strong>{email}</strong> 주소로 비밀번호 재설정 링크를 보내드렸습니다.
        </Text>
        <Text type="secondary" className="block">
          이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
        </Text>
      </div>
      
      <Alert
        message="이메일이 오지 않았나요?"
        description={
          <div className="space-y-1">
            <div>• 스팸 폴더를 확인해보세요</div>
            <div>• 이메일 주소가 정확한지 확인해보세요</div>
            <div>• 몇 분 후에 다시 시도해보세요</div>
          </div>
        }
        type="info"
        showIcon
        className="text-left mt-4"
      />

      <Button
        onClick={() => setCurrentStep(0)}
        className="mt-4"
      >
        다른 이메일로 다시 시도
      </Button>
    </div>
  );

  const renderResetPasswordStep = () => (
    <Form
      form={form}
      name="reset-password"
      onFinish={handleResetPassword}
      layout="vertical"
      size="large"
    >
      <div className="text-center mb-6">
        <Title level={4}>새 비밀번호 설정</Title>
        <Text type="secondary">
          새로운 비밀번호를 입력하여 계정 보안을 강화하세요.
        </Text>
      </div>

      <Form.Item
        name="password"
        label="새 비밀번호"
        rules={[
          { required: true, message: '새 비밀번호를 입력해주세요' },
          { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="새 비밀번호를 입력하세요"
          autoComplete="new-password"
        />
      </Form.Item>

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
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={resetting}
          className="h-12 text-lg font-medium"
        >
          비밀번호 변경
        </Button>
      </Form.Item>
    </Form>
  );

  const renderCompleteStep = () => (
    <Result
      status="success"
      title="비밀번호가 성공적으로 변경되었습니다!"
      subTitle="이제 새로운 비밀번호로 로그인할 수 있습니다."
      extra={[
        <Button
          key="login"
          type="primary"
          size="large"
          onClick={() => navigate('/login')}
        >
          로그인하러 가기
        </Button>,
      ]}
    />
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderEmailStep();
      case 1:
        return renderEmailSentStep();
      case 2:
        return renderResetPasswordStep();
      case 3:
        return renderCompleteStep();
      default:
        return renderEmailStep();
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
            비밀번호 찾기
          </Text>
        </div>

        {/* Steps */}
        {currentStep < 3 && (
          <Card className="shadow-sm">
            <Steps current={currentStep} size="small">
              {steps.map((step, index) => (
                <Step key={index} title={step.title} />
              ))}
            </Steps>
          </Card>
        )}

        {/* Main Card */}
        <Card className="shadow-lg">
          {renderStepContent()}
        </Card>

        {/* Back to Login */}
        {currentStep !== 3 && (
          <div className="text-center">
            <Link 
              to="/login"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeftOutlined className="mr-1" />
              로그인으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;