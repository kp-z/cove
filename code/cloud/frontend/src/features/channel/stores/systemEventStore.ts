/**
 * SystemEventStore - 系统事件状态管理
 * 
 * 存储和管理所有频道的系统事件,用于调试面板
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SystemEvent, SystemEventType, SystemEventLevel } from '../types/system-event';

interface SystemEventStore {
  // 按 channelId 分组的事件
  events: Map<string, SystemEvent[]>;
  
  // 全局开关（只在开发环境启用）
  enabled: boolean;
  
  // 最大事件数量（每个 channel）
  maxEventsPerChannel: number;
  
  // Actions
  logEvent: (channelId: string, type: SystemEventType, message: string, metadata?: Record<string, any>) => void;
  getEvents: (channelId: string) => SystemEvent[];
  clearEvents: (channelId: string) => void;
  clearAllEvents: () => void;
  setEnabled: (enabled: boolean) => void;
}

const MAX_EVENTS_PER_CHANNEL = 100;

/**
 * 判断事件级别
 */
function getEventLevel(type: SystemEventType): SystemEventLevel {
  if (type.startsWith('error.') || type.includes('error') || type.includes('failed')) {
    return 'error';
  }
  if (type.includes('warn') || type === 'websocket.disconnected') {
    return 'warn';
  }
  if (type.startsWith('message.') || type.startsWith('websocket.')) {
    return 'info';
  }
  return 'debug';
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useSystemEventStore = create<SystemEventStore>()(
  devtools(
    (set, get) => ({
      events: new Map(),
      enabled: process.env.NODE_ENV === 'development',
      maxEventsPerChannel: MAX_EVENTS_PER_CHANNEL,

      logEvent: (channelId, type, message, metadata) => {
        const { enabled, maxEventsPerChannel } = get();

        // 如果未启用,直接返回
        if (!enabled) return;

        const event: SystemEvent = {
          id: generateId(),
          type,
          level: getEventLevel(type),
          timestamp: new Date(),
          channelId,
          message,
          metadata,
          stack: type.startsWith('error.') ? new Error().stack : undefined,
        };

        set((state) => {
          const newEvents = new Map(state.events);
          const channelEvents = newEvents.get(channelId) || [];

          // 添加新事件
          const updatedEvents = [...channelEvents, event];

          // 限制数量（保留最新的）
          if (updatedEvents.length > maxEventsPerChannel) {
            updatedEvents.shift();
          }

          newEvents.set(channelId, updatedEvents);

          return { events: newEvents };
        }, false, 'logEvent'); // 添加 action name 用于 devtools

        // 同时输出到控制台（开发环境）
        if (process.env.NODE_ENV === 'development') {
          const levelMethod = event.level === 'error' ? 'error' : event.level === 'warn' ? 'warn' : 'log';
          console[levelMethod](
            `[${event.type}]`,
            message,
            metadata ? metadata : ''
          );
        }
      },

      getEvents: (channelId) => {
        return get().events.get(channelId) || [];
      },

      clearEvents: (channelId) => {
        set((state) => {
          const newEvents = new Map(state.events);
          newEvents.delete(channelId);
          return { events: newEvents };
        }, false, 'clearEvents');
      },

      clearAllEvents: () => {
        set({ events: new Map() }, false, 'clearAllEvents');
      },

      setEnabled: (enabled) => {
        set({ enabled }, false, 'setEnabled');
      },
    }),
    { name: 'SystemEventStore' }
  )
);

/**
 * 便捷的日志函数
 * 使用方式: systemLog.info(channelId, 'message.sent', 'Message sent successfully', { messageId })
 */
export const systemLog = {
  event: (channelId: string, type: SystemEventType, message: string, metadata?: Record<string, any>) => {
    useSystemEventStore.getState().logEvent(channelId, type, message, metadata);
  },
  
  info: (channelId: string, type: SystemEventType, message: string, metadata?: Record<string, any>) => {
    useSystemEventStore.getState().logEvent(channelId, type, message, metadata);
  },
  
  error: (channelId: string, type: SystemEventType, message: string, metadata?: Record<string, any>) => {
    useSystemEventStore.getState().logEvent(channelId, type, message, metadata);
  },
  
  warn: (channelId: string, type: SystemEventType, message: string, metadata?: Record<string, any>) => {
    useSystemEventStore.getState().logEvent(channelId, type, message, metadata);
  },
};
