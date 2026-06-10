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
import { logger } from '@/lib/logger';

const log = logger.scope('useSendMessage');

export function useSendMessage() {
  const { userId, user } = useCurrentUser();
  const mutation = trpc.message.send.useMutation();
  const queryClient = useQueryClient();
  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      log.debug('Network back online');
    };

    const handleOffline = () => {
      log.debug('Network offline');
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
      // 1. 创建本地消息
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      log.debug('Sending message', { channelId, tempId });

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
      messageStateManager.addLocalMessage(localMessage);

      // 3. 检查网络状态
      if (!navigator.onLine) {
        // 离线：标记为排队状态
        log.debug('Offline, queuing message', { tempId });
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
        // 标记为 sending 状态
        messageStateManager.updateMessageStatus(tempId, 'sending');

        const result = await mutation.mutateAsync({
          channelId,
          senderId: userId || 'unknown',
          senderType: 'human',
          content,
        });

        // 5. 契约1：关联服务端权威 id，便于后续 syncRemoteMessages 精确去重
        const serverMessageId =
          (result as any)?.message_id ?? (result as any)?.messageId;
        if (serverMessageId) {
          messageStateManager.attachServerId(tempId, serverMessageId);
        }

        // 6. 成功：标记为 sent
        messageStateManager.updateMessageStatus(tempId, 'sent');

        // 7. 触发 lastMessage 缓存失效，更新 channel list
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
