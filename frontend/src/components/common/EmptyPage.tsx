import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

interface EmptyPageProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({
  title = '페이지 개발 중',
  subtitle = '이 페이지는 현재 개발 중입니다. 곧 완성될 예정입니다.',
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className=\"flex items-center justify-center min-h-96\">
      <Result
        status=\"info\"
        title={title}
        subTitle={subtitle}
        extra={
          showBackButton && (
            <Button type=\"primary\" onClick={() => navigate('/dashboard')}>
              대시보드로 돌아가기
            </Button>
          )
        }
      />
    </div>
  );
};

export default EmptyPage;", "original_text": ""}]