/**
 * 系统事件类型定义
 * 用于 Timeline 调试面板
 */

export type SystemEventType =
  // WebSocket 事件
  | 'websocket.connected'
  | 'websocket.disconnected'
  | 'websocket.error'
  | 'websocket.message_received'
  | 'websocket.subscription_started'
  | 'websocket.subscription_error'
  
  // 消息生命周期事件
  | 'message.created_local'
  | 'message.sent'
  | 'message.queued'
  | 'message.failed'
  | 'message.synced'
  | 'message.streaming_start'
  | 'message.streaming_phase'
  | 'message.streaming_complete'
  
  // 状态管理事件
  | 'state.updated'
  | 'state.subscribers_notified'
  | 'state.cleanup'
  
  // 错误事件
  | 'error.network'
  | 'error.validation'
  | 'error.unknown';

export type SystemEventLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  level: SystemEventLevel;
  timestamp: Date;
  channelId: string;
  message: string;
  metadata?: Record<string, any>;
  stack?: string; // 错误堆栈
}

/**
 * 获取事件级别对应的颜色
 */
export function getEventLevelColor(level: SystemEventLevel): string {
  switch (level) {
    case 'info':
      return 'text-blue-400';
    case 'warn':
      return 'text-yellow-400';
    case 'error':
      return 'text-red-400';
    case 'debug':
      return 'text-gray-400';
  }
}

/**
 * 获取事件类型的显示名称
 */
export function getEventTypeLabel(type: SystemEventType): string {
  const labels: Record<SystemEventType, string> = {
    'websocket.connected': 'WebSocket Connected',
    'websocket.disconnected': 'WebSocket Disconnected',
    'websocket.error': 'WebSocket Error',
    'websocket.message_received': 'WS Message Received',
    'websocket.subscription_started': 'Subscription Started',
    'websocket.subscription_error': 'Subscription Error',
    
    'message.created_local': 'Message Created (Local)',
    'message.sent': 'Message Sent',
    'message.queued': 'Message Queued',
    'message.failed': 'Message Failed',
    'message.synced': 'Message Synced',
    'message.streaming_start': 'Streaming Started',
    'message.streaming_phase': 'Streaming Phase Change',
    'message.streaming_complete': 'Streaming Complete',
    
    'state.updated': 'State Updated',
    'state.subscribers_notified': 'Subscribers Notified',
    'state.cleanup': 'State Cleanup',
    
    'error.network': 'Network Error',
    'error.validation': 'Validation Error',
    'error.unknown': 'Unknown Error',
  };
  
  return labels[type] || type;
}

/**
 * 获取事件类型的分组
 */
export function getEventCategory(type: SystemEventType): string {
  if (type.startsWith('websocket.')) return 'WebSocket';
  if (type.startsWith('message.')) return 'Message';
  if (type.startsWith('state.')) return 'State';
  if (type.startsWith('error.')) return 'Error';
  return 'Other';
}
