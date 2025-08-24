import React from 'react';
import { Spin, SpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import classNames from 'classnames';

interface LoadingSpinnerProps extends SpinProps {
  size?: 'small' | 'default' | 'large';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  text,
  fullScreen = false,
  overlay = false,
  className,
  children,
  ...props
}) => {
  const indicator = <LoadingOutlined style={{ fontSize: getIconSize(size) }} spin />;

  const spinClasses = classNames(
    'flex items-center justify-center',
    {
      'fixed inset-0 z-50 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75': fullScreen,
      'absolute inset-0 z-10 bg-white bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50': overlay && !fullScreen,
      'min-h-32': !fullScreen && !overlay,
    },
    className
  );

  const content = (
    <Spin
      indicator={indicator}
      size={size}
      tip={text}
      {...props}
    >
      {children}
    </Spin>
  );

  if (fullScreen || overlay) {
    return (
      <div className={spinClasses}>
        {content}
      </div>
    );
  }

  return content;
};

function getIconSize(size: 'small' | 'default' | 'large'): number {
  switch (size) {
    case 'small':
      return 14;
    case 'large':
      return 32;
    default:
      return 24;
  }
}

export default LoadingSpinner;", "original_text": ""}]