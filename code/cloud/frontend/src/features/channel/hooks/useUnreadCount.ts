/**
 * useUnreadCount Hook
 *
 * 管理频道的未读消息计数
 * 使用 WebSocket 实时更新 + localStorage 持久化
 */

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/core/auth';
import { ENABLE_MOCK_DATA, getMockUnreadCount } from './mockData';

// localStorage key 前缀
const UNREAD_COUNT_KEY_PREFIX = 'channel_unread_';

// 获取 localStorage key
function getUnreadCountKey(channelId: string, userId: string): string {
  return `${UNREAD_COUNT_KEY_PREFIX}${userId}_${channelId}`;
}

// 从 localStorage 读取未读计数
function loadUnreadCount(channelId: string, userId: string): number {
  try {
    const key = getUnreadCountKey(channelId, userId);
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.error('Failed to load unread count:', error);
    return 0;
  }
}

// 保存未读计数到 localStorage
function saveUnreadCount(channelId: string, userId: string, count: number): void {
  try {
    const key = getUnreadCountKey(channelId, userId);
    localStorage.setItem(key, count.toString());
  } catch (error) {
    console.error('Failed to save unread count:', error);
  }
}

// 清除未读计数
function clearUnreadCount(channelId: string, userId: string): void {
  try {
    const key = getUnreadCountKey(channelId, userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear unread count:', error);
  }
}

export function useUnreadCount(channelId: string): number {
  const { userId } = useCurrentUser();

  const [unreadCount, setUnreadCount] = useState<number>(() => {
    if (!userId) return 0;

    // 开发模式：使用模拟数据
    if (ENABLE_MOCK_DATA) {
      return getMockUnreadCount(channelId);
    }

    return loadUnreadCount(channelId, userId);
  });

  useEffect(() => {
    if (!userId) return;

    // 初始加载
    if (ENABLE_MOCK_DATA) {
      setUnreadCount(getMockUnreadCount(channelId));
    } else {
      const count = loadUnreadCount(channelId, userId);
      setUnreadCount(count);
    }

    // TODO: 订阅 WebSocket 'message.new' 事件
    // const unsubscribe = eventBus.on('message.new', (event) => {
    //   if (event.channelId === channelId && event.senderId !== userId) {
    //     setUnreadCount((prev) => {
    //       const newCount = prev + 1;
    //       saveUnreadCount(channelId, userId, newCount);
    //       return newCount;
    //     });
    //   }
    // });

    // TODO: 订阅频道查看事件（标记为已读）
    // const unsubscribeView = eventBus.on('channel.viewed', (event) => {
    //   if (event.channelId === channelId) {
    //     setUnreadCount(0);
    //     clearUnreadCount(channelId, userId);
    //   }
    // });

    // return () => {
    //   unsubscribe();
    //   unsubscribeView();
    // };
  }, [channelId, userId]);

  return unreadCount;
}

// 手动标记频道为已读
export function markChannelAsRead(channelId: string, userId: string): void {
  clearUnreadCount(channelId, userId);
}

// 手动增加未读计数（用于测试）
export function incrementUnreadCount(channelId: string, userId: string): void {
  const current = loadUnreadCount(channelId, userId);
  saveUnreadCount(channelId, userId, current + 1);
}

// 获取所有频道的未读总数
export function getTotalUnreadCount(userId: string): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${UNREAD_COUNT_KEY_PREFIX}${userId}_`)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += parseInt(value, 10);
        }
      }
    }
    return total;
  } catch (error) {
    console.error('Failed to get total unread count:', error);
    return 0;
  }
}
