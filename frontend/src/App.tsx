import React from 'react';
import { Layout, Typography, Button, Space, Card } from 'antd';
import { CloudOutlined, ThunderboltOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { selectTheme, setTheme } from './store/slices/uiSlice';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <CloudOutlined className="text-2xl text-primary-500" />
          <Title level={3} className="!mb-0 !text-white">
            CloudsLinker
          </Title>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            type="primary" 
            ghost
            onClick={toggleTheme}
          >
            {theme === 'light' ? '🌙' : '☀️'} 테마 변경
          </Button>
        </div>
      </Header>

      <Content className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Title level={1} className="!mb-4">
              차세대 클라우드 스토리지 관리 플랫폼
            </Title>
            <Paragraph className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              PikPak, WebDAV, Synology NAS를 하나의 플랫폼에서 통합 관리하세요. 
              제로 대역폭 클라우드 간 직접 전송으로 효율적이고 안전한 데이터 이동을 경험하세요.
            </Paragraph>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card 
              className="text-center"
              hoverable
              cover={
                <div className="pt-8 pb-4">
                  <ThunderboltOutlined className="text-4xl text-primary-500" />
                </div>
              }
            >
              <Title level={4}>제로 로컬 임팩트</Title>
              <Paragraph className="text-gray-600 dark:text-gray-300">
                모든 전송이 클라우드 간 직접 발생하여 로컬 대역폭을 소비하지 않습니다.
              </Paragraph>
            </Card>

            <Card 
              className="text-center"
              hoverable
              cover={
                <div className="pt-8 pb-4">
                  <CloudOutlined className="text-4xl text-success-500" />
                </div>
              }
            >
              <Title level={4}>핵심 프로바이더 지원</Title>
              <Paragraph className="text-gray-600 dark:text-gray-300">
                PikPak, WebDAV, Synology NAS를 완벽하게 지원하며 추가 프로바이더도 계속 확장됩니다.
              </Paragraph>
            </Card>

            <Card 
              className="text-center"
              hoverable
              cover={
                <div className="pt-8 pb-4">
                  <SafetyCertificateOutlined className="text-4xl text-warning-500" />
                </div>
              }
            >
              <Title level={4}>엔터프라이즈 보안</Title>
              <Paragraph className="text-gray-600 dark:text-gray-300">
                256-bit AES 암호화, OAuth 인증, GDPR 준수로 안전한 데이터 관리를 제공합니다.
              </Paragraph>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Space size="large">
              <Button type="primary" size="large">
                시작하기
              </Button>
              <Button size="large">
                더 알아보기
              </Button>
            </Space>
          </div>
        </div>
      </Content>

      <Footer className="text-center bg-gray-50 dark:bg-gray-800">
        <Paragraph className="!mb-0 text-gray-600 dark:text-gray-300">
          CloudsLinker ©2024 Created with ❤️ for efficient cloud management
        </Paragraph>
      </Footer>
    </Layout>
  );
}

export default App;
