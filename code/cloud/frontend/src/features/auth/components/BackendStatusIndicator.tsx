/**
 * BackendStatusIndicator - 后端连接状态指示灯
 * 
 * 显示后端是否在线，用于登录页面
 */

import { useBackendHealth } from '@/core/hooks/useBackendHealth';
import { Server } from 'lucide-react';

export function BackendStatusIndicator() {
  const status = useBackendHealth();

  const statusConfig = {
    online: {
      color: 'bg-green-400',
      label: 'Backend Online',
      dotClass: 'animate-pulse',
    },
    offline: {
      color: 'bg-red-400',
      label: 'Backend Offline',
      dotClass: '',
    },
    checking: {
      color: 'bg-yellow-400',
      label: 'Checking...',
      dotClass: 'animate-pulse',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`w-2 h-2 rounded-full ${config.color} ${config.dotClass}`} />
  );
}
