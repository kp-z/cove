/**
 * StatusIndicator - 统一的状态指示器组件
 *
 * 用于显示在线/离线/未知/错误状态
 *
 * 复用场景：
 * - Device 状态
 * - Realm 状态
 * - 用户在线状态
 * - 服务健康状态
 */

import { cn } from '@/shared/lib/utils';

export type StatusType = 'online' | 'offline' | 'unknown' | 'error';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  online: {
    color: 'bg-green-500',
    text: 'Online',
    icon: '●',
  },
  offline: {
    color: 'bg-red-500',
    text: 'Offline',
    icon: '●',
  },
  unknown: {
    color: 'bg-gray-400',
    text: 'Unknown',
    icon: '●',
  },
  error: {
    color: 'bg-yellow-500',
    text: 'Error',
    icon: '⚠',
  },
} as const;

const sizeClasses = {
  sm: 'w-2 h-2 text-xs',
  md: 'w-3 h-3 text-sm',
  lg: 'w-4 h-4 text-base',
} as const;

export function StatusIndicator({
  status,
  label,
  size = 'md',
  showLabel = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn('rounded-full', config.color, sizeClass)}
        title={label || config.text}
      />
      {showLabel && (
        <span className="text-gray-600 dark:text-gray-400">
          {label || config.text}
        </span>
      )}
    </div>
  );
}
