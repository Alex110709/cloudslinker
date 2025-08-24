import React from 'react';
import { Progress, ProgressProps, Tooltip } from 'antd';
import { formatPercentage, formatFileSize, formatTransferSpeed, formatDuration } from '../../utils';
import classNames from 'classnames';

export interface ProgressBarProps extends Omit<ProgressProps, 'percent'> {
  // Progress data
  percentage?: number;
  bytesTransferred?: number;
  bytesTotal?: number;
  transferSpeed?: number;
  estimatedTimeRemaining?: number;
  
  // Display options
  showPercentage?: boolean;
  showBytes?: boolean;
  showSpeed?: boolean;
  showTimeRemaining?: boolean;
  showTooltip?: boolean;
  
  // Layout
  layout?: 'horizontal' | 'vertical' | 'circle';
  size?: 'small' | 'default' | 'large';
  
  // Custom labels
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage = 0,
  bytesTransferred = 0,
  bytesTotal = 0,
  transferSpeed = 0,
  estimatedTimeRemaining = 0,
  showPercentage = true,
  showBytes = false,
  showSpeed = false,
  showTimeRemaining = false,
  showTooltip = true,
  layout = 'horizontal',
  size = 'default',
  label,
  className,
  status,
  ...props
}) => {
  const progressValue = Math.min(Math.max(percentage, 0), 100);
  
  // Determine status based on percentage and props
  const progressStatus = status || getProgressStatus(progressValue);
  
  // Generate info text
  const infoText = generateInfoText({
    percentage: progressValue,
    bytesTransferred,
    bytesTotal,
    transferSpeed,
    estimatedTimeRemaining,
    showPercentage,
    showBytes,
    showSpeed,
    showTimeRemaining,
  });
  
  // Generate tooltip content
  const tooltipContent = generateTooltipContent({
    percentage: progressValue,
    bytesTransferred,
    bytesTotal,
    transferSpeed,
    estimatedTimeRemaining,
  });
  
  // Progress size mapping
  const progressSize = size === 'large' ? 'default' : size;
  const strokeWidth = size === 'small' ? 6 : size === 'large' ? 10 : 8;
  
  const progressClasses = classNames(
    'cloudslinker-progress',
    {
      'cloudslinker-progress--small': size === 'small',
      'cloudslinker-progress--large': size === 'large',
      'cloudslinker-progress--with-label': label,
    },
    className
  );
  
  const renderProgress = () => {
    const baseProps = {
      percent: progressValue,
      status: progressStatus,
      strokeWidth,
      showInfo: false, // We'll show custom info
      ...props,
    };
    
    switch (layout) {
      case 'circle':
        return (
          <Progress
            {...baseProps}
            type=\"circle\"
            size={size === 'small' ? 60 : size === 'large' ? 120 : 80}
            format={() => formatPercentage(progressValue, 0)}
          />
        );
      
      case 'vertical':
        return (
          <div className=\"flex flex-col items-center space-y-2\">
            <Progress
              {...baseProps}
              type=\"line\"
              size={progressSize}
              className=\"transform rotate-90 origin-center\"
              style={{ width: 100 }}
            />
            {infoText && (
              <div className=\"text-xs text-gray-500 text-center\">
                {infoText}
              </div>
            )}
          </div>
        );
      
      default: // horizontal
        return (
          <div className=\"space-y-1\">
            <Progress
              {...baseProps}
              type=\"line\"
              size={progressSize}
            />
            {infoText && (
              <div className=\"text-xs text-gray-500 flex justify-between\">
                <span>{formatPercentage(progressValue, 1)}</span>
                <span>{infoText}</span>
              </div>
            )}
          </div>
        );
    }
  };
  
  const progressElement = renderProgress();
  
  // Wrap with tooltip if enabled
  if (showTooltip && tooltipContent) {
    return (
      <div className={progressClasses}>
        {label && (
          <div className=\"mb-2 text-sm font-medium text-gray-700 dark:text-gray-300\">
            {label}
          </div>
        )}
        <Tooltip title={tooltipContent} placement=\"top\">
          {progressElement}
        </Tooltip>
      </div>
    );
  }
  
  return (
    <div className={progressClasses}>
      {label && (
        <div className=\"mb-2 text-sm font-medium text-gray-700 dark:text-gray-300\">
          {label}
        </div>
      )}
      {progressElement}
    </div>
  );
};

function getProgressStatus(percentage: number): 'success' | 'exception' | 'normal' | 'active' {
  if (percentage === 100) return 'success';
  if (percentage === 0) return 'normal';
  return 'active';
}

function generateInfoText({
  percentage,
  bytesTransferred,
  bytesTotal,
  transferSpeed,
  estimatedTimeRemaining,
  showPercentage,
  showBytes,
  showSpeed,
  showTimeRemaining,
}: {
  percentage: number;
  bytesTransferred: number;
  bytesTotal: number;
  transferSpeed: number;
  estimatedTimeRemaining: number;
  showPercentage: boolean;
  showBytes: boolean;
  showSpeed: boolean;
  showTimeRemaining: boolean;
}): string {
  const parts: string[] = [];
  
  if (showBytes && bytesTotal > 0) {
    parts.push(`${formatFileSize(bytesTransferred)} / ${formatFileSize(bytesTotal)}`);
  }
  
  if (showSpeed && transferSpeed > 0) {
    parts.push(formatTransferSpeed(transferSpeed));
  }
  
  if (showTimeRemaining && estimatedTimeRemaining > 0) {
    parts.push(`${formatDuration(estimatedTimeRemaining)} 남음`);
  }
  
  return parts.join(' • ');
}

function generateTooltipContent({
  percentage,
  bytesTransferred,
  bytesTotal,
  transferSpeed,
  estimatedTimeRemaining,
}: {
  percentage: number;
  bytesTransferred: number;
  bytesTotal: number;
  transferSpeed: number;
  estimatedTimeRemaining: number;
}): React.ReactNode {
  return (
    <div className=\"space-y-1\">
      <div>진행률: {formatPercentage(percentage, 1)}</div>
      {bytesTotal > 0 && (
        <div>
          크기: {formatFileSize(bytesTransferred)} / {formatFileSize(bytesTotal)}
        </div>
      )}
      {transferSpeed > 0 && (
        <div>속도: {formatTransferSpeed(transferSpeed)}</div>
      )}
      {estimatedTimeRemaining > 0 && (
        <div>남은 시간: {formatDuration(estimatedTimeRemaining)}</div>
      )}
    </div>
  );
}

export default ProgressBar;", "original_text": ""}]