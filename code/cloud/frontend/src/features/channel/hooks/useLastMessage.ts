/**
 * useLastMessage Hook
 *
 * 管理频道最后消息的查询和实时更新
 * 使用 LRU 缓存策略（最多 100 个频道）+ tRPC Query + WebSocket 订阅
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import type { LastMessagePreview } from '../types/channel-state.types';

// LRU 缓存实现
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // 移到最后（最近使用）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果超过容量，删除最旧的（第一个）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 全局消息缓存（最多 100 个频道）
const messageCache = new LRUCache<string, LastMessagePreview>(100);

export function useLastMessage(channelId: string): LastMessagePreview | null {
  const [lastMessage, setLastMessage] = useState<LastMessagePreview | null>(
    () => messageCache.get(channelId) || null
  );

  // 查询最后一条消息
  const { data: message } = trpc.message.getLastByChannel.useQuery(
    { channelId },
    {
      enabled: !!channelId,
      staleTime: 30000,           // 缓存 30 秒
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // 更新本地状态（来自查询）
  useEffect(() => {
    if (message) {
      const preview: LastMessagePreview = {
        messageId: message.message_id,
        content: message.content || '',
        senderId: message.sender_id,
        senderName: message.sender_name || 'Unknown',
        senderType: message.sender_type,
        timestamp: message.created_at,
        isSystemMessage: message.sender_type === 'system',
      };
      messageCache.set(channelId, preview);
      setLastMessage(preview);
    }
  }, [message, channelId]);

  // 订阅 WebSocket 实时更新
  trpc.subscription.onMessage.useSubscription(
    { channelId, events: ['message.created'] },
    {
      enabled: !!channelId,
      onData: (event) => {
        // 只处理非线程消息
        if (event.data.channelId === channelId && !event.data.threadId) {
          const preview: LastMessagePreview = {
            messageId: event.data.messageId,
            content: event.data.content || '',
            senderId: event.data.senderId,
            senderName: event.data.senderName || 'Unknown',
            senderType: event.data.senderType,
            timestamp: event.data.timestamp,
            isSystemMessage: event.data.senderType === 'system',
          };
          messageCache.set(channelId, preview);
          setLastMessage(preview);
        }
      },
    }
  );

  return lastMessage;
}

// 手动更新缓存（用于乐观更新）
export function updateLastMessageCache(
  channelId: string,
  message: LastMessagePreview
): void {
  messageCache.set(channelId, message);
}

// 清除缓存（用于测试或重置）
export function clearLastMessageCache(): void {
  messageCache.clear();
}
