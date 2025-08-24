import React from 'react';
import { Badge, Tooltip, Space, Typography } from 'antd';
import { WifiOutlined, LoadingOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useConnectionStatus } from '../hooks/useWebSocket';

const { Text } = Typography;

interface ConnectionIndicatorProps {
  showText?: boolean;
  size?: 'small' | 'default';
  placement?: 'header' | 'inline';
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  showText = true,
  size = 'default',
  placement = 'inline'
}) => {
  const { isConnected, isConnecting, statusColor, statusText } = useConnectionStatus();

  const getIcon = () => {
    if (isConnecting) {
      return <LoadingOutlined spin style={{ color: statusColor }} />;
    }
    if (isConnected) {
      return <WifiOutlined style={{ color: statusColor }} />;
    }
    return <DisconnectOutlined style={{ color: statusColor }} />;
  };

  const content = (
    <Space size={4} align=\"center\">
      {getIcon()}
      {showText && (
        <Text 
          style={{ 
            color: statusColor,
            fontSize: size === 'small' ? '12px' : '14px'
          }}
        >
          {statusText}
        </Text>
      )}
    </Space>
  );

  if (placement === 'header') {
    return (
      <Tooltip title=\"실시간 모니터링 연결 상태\">
        <Badge 
          dot 
          color={statusColor}
          style={{ 
            cursor: 'help',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {content}
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`실시간 모니터링 ${statusText}`}>
      <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
        {content}
      </div>
    </Tooltip>
  );
};

export default ConnectionIndicator;