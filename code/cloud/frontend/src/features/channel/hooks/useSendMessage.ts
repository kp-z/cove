/**
 * useSendMessage Hook
 * 处理消息发送、optimistic update、错误处理、重试和离线排队
 */

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useCurrentUser } from '@/core/auth';
import { Message, type MessageError } from '../domain/models';
import { messageStateManager } from '../domain/MessageStateManager';
import { messageQueue } from '../domain/MessageQueue';
import { systemLog } from '../stores/systemEventStore';

export function useSendMessage() {
  const { userId, user } = useCurrentUser();
  const mutation = trpc.message.send.useMutation();
  const queryClient = useQueryClient();
  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useSendMessage] Network back online, processing queue...');
      // 网络恢复后，处理队列中的消息
      // messageQueue 会自动处理，这里只是日志
    };

    const handleOffline = () => {
      console.log('[useSendMessage] Network offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const send = useCallback(
    async (channelId: string, content: string) => {
      console.log('🚀🚀🚀 [useSendMessage] send() CALLED!!! 🚀🚀🚀', { channelId, content });
      console.log('👉 This should appear IMMEDIATELY when you send a message!');

      // 1. 创建本地消息
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      console.log('📝 [useSendMessage] Creating local message with tempId:', tempId);

      const localMessage = new Message({
        id: tempId,
        tempId,
        channelId,
        senderId: userId || 'unknown',
        senderName: user?.display_name || user?.username,
        senderType: 'user',
        content,
        timestamp: new Date(),
        source: 'local',
        status: 'pending',
        retryCount: 0,
      });

      // 2. 立即添加到状态管理器（optimistic update）
      console.log('[useSendMessage] Adding local message:', {
        id: localMessage.id,
        content: localMessage.content.substring(0, 50),
        channelId: localMessage.channelId,
        status: localMessage.status,
      });
      messageStateManager.addLocalMessage(localMessage);
      console.log('[useSendMessage] Local message added successfully');

      // 3. 检查网络状态
      if (!navigator.onLine) {
        // 离线：标记为排队状态
        console.log('[useSendMessage] Offline, queuing message');
        systemLog.warn(channelId, 'message.queued', 'Message queued (offline)', { messageId: tempId });
        messageStateManager.updateMessageStatus(tempId, 'queued');
        messageQueue.enqueue({
          id: tempId,
          channelId,
          content,
          senderId: userId || 'unknown',
          timestamp: new Date(),
          retryCount: 0,
        });
        return;
      }

      // 4. 发送到服务器
      try {
        console.log('[useSendMessage] Sending to server...');

        // 标记为 sending 状态
        messageStateManager.updateMessageStatus(tempId, 'sending');

        const result = await mutation.mutateAsync({
          channelId,
          senderId: userId || 'unknown',
          senderType: 'human',
          content,
        });

        // 5. 成功：标记为 sent
        console.log('[useSendMessage] Message sent successfully');
        messageStateManager.updateMessageStatus(tempId, 'sent');

        // 6. 触发 lastMessage 缓存失效，更新 channel list
        queryClient.invalidateQueries({
          queryKey: [['message', 'getLastByChannel'], { input: { channelId } }],
        });

        // 通知队列（如果是从队列发送的）
        window.dispatchEvent(
          new CustomEvent('queue:message-sent', { detail: { id: tempId } })
        );
      } catch (error: any) {
        // 7. 失败：标记为 failed
        const messageError: MessageError = {
          code: error.data?.code || 'UNKNOWN_ERROR',
          message: error.message || '发送失败',
          retryable: error.data?.code !== 'FORBIDDEN',
        };

        messageStateManager.updateMessageStatus(tempId, 'failed', messageError);

        // 通知队列
        window.dispatchEvent(
          new CustomEvent('queue:message-failed', {
            detail: { id: tempId, error: messageError.message },
          })
        );
      }
    },
    [userId, user?.display_name, user?.username, mutation, queryClient]
  );

  const retry = useCallback(
    (message: Message) => {
      if (!message.canRetry()) return;

      // 重置为 pending
      messageStateManager.updateMessageStatus(message.id, 'pending');

      // 重新发送
      send(message.channelId, message.content);
    },
    [send]
  );

  return { send, retry, isLoading: mutation.isPending };
}
