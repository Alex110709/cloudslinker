import React from 'react';
import { Card, Statistic, StatisticProps } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import classNames from 'classnames';

interface StatCardProps extends Omit<StatisticProps, 'value'> {
  title: string;
  value: number | string;
  change?: {
    value: number;
    trend: 'up' | 'down';
    period?: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  loading,
  variant = 'default',
  className,
  ...props
}) => {
  const getVariantColors = (variant: string) => {
    switch (variant) {
      case 'primary':
        return {
          text: 'text-primary-600',
          bg: 'bg-primary-50',
          border: 'border-primary-200',
        };
      case 'success':
        return {
          text: 'text-success-600',
          bg: 'bg-success-50',
          border: 'border-success-200',
        };
      case 'warning':
        return {
          text: 'text-warning-600',
          bg: 'bg-warning-50',
          border: 'border-warning-200',
        };
      case 'error':
        return {
          text: 'text-error-600',
          bg: 'bg-error-50',
          border: 'border-error-200',
        };
      default:
        return {
          text: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
        };
    }
  };

  const colors = getVariantColors(variant);

  const cardClasses = classNames(
    'transition-all duration-200 hover:shadow-md',
    {
      [colors.border]: variant !== 'default',
    },
    className
  );

  return (
    <Card
      loading={loading}
      className={cardClasses}
      bodyStyle={{ padding: '20px' }}
    >
      <div className=\"flex items-start justify-between\">
        <div className=\"flex-1\">
          <Statistic
            title={title}
            value={value}
            valueStyle={{
              color: variant !== 'default' ? undefined : '#262626',
              fontSize: '24px',
              fontWeight: 600,
            }}
            {...props}
          />
          
          {change && (
            <div className=\"mt-2 flex items-center text-sm\">
              <div
                className={classNames('flex items-center', {
                  'text-success-600': change.trend === 'up',
                  'text-error-600': change.trend === 'down',
                })}
              >
                {change.trend === 'up' ? (
                  <ArrowUpOutlined className=\"mr-1\" />
                ) : (
                  <ArrowDownOutlined className=\"mr-1\" />
                )}
                <span className=\"font-medium\">
                  {Math.abs(change.value)}%
                </span>
              </div>
              {change.period && (
                <span className=\"ml-1 text-gray-500\">
                  {change.period}
                </span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div
            className={classNames(
              'flex items-center justify-center w-12 h-12 rounded-lg',
              colors.bg,
              colors.text
            )}
          >
            <div className=\"text-2xl\">{icon}</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;", "original_text": ""}]