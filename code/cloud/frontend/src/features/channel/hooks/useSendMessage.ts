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

// 占位气泡超时阈值：若 agent 在此时间内仍未被触发（占位停留在 pending），则清理占位。
const PLACEHOLDER_TIMEOUT_MS = 30000;

// 发送时可选传入的「将要回复的 agent」信息，用于即时插入拟人化占位气泡。
export interface RespondingAgentInfo {
  agentId: string;
  agentName: string;
}

export interface SendOptions {
  // 非空表示本频道存在会回复的 agent（DM 中有 agent，或 agentPool 非空）。
  respondingAgent?: RespondingAgentInfo | null;
}

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
    async (channelId: string, content: string, options?: SendOptions) => {
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
      messageStateManager.addPendingSend(localMessage);

      // 2.1 若本频道存在会回复的 agent，则立即建立一个 provisional 的 agent 进度叠加层
      //     （phase = 'pending'），让用户瞬间看到「对方正在回复」的占位气泡。
      //     占位本身不存正文，由 getMessages 在落库前现合成；落库后自动消失。
      //     纯人类频道（无 respondingAgent）不建立进度。
      const replyAgent = options?.respondingAgent;
      if (replyAgent && replyAgent.agentId) {
        // provisional 进度键为 `pending:<tempId>`，记录其回复的用户消息本地 id，
        // 以便 accepted(inReplyTo) 经 attachServerId 回填后能精确认领。
        messageStateManager.startAgentProgress(channelId, {
          repliesToLocalId: tempId,
          agentId: replyAgent.agentId,
          agentName: replyAgent.agentName || 'Agent',
        });

        // 超时兜底：30s 内若进度仍停留在 pending（agent 始终未被触发 / 无 accepted），
        // 则清理该 provisional 进度。若期间已被 promote 认领，键已变为权威 id，
        // removeProvisionalIfPending 按 provisional 键查不到 → 自动空操作。
        setTimeout(() => {
          messageStateManager.removeProvisionalIfPending(`pending:${tempId}`);
        }, PLACEHOLDER_TIMEOUT_MS);
      }

      // 3. 检查网络状态
      if (!navigator.onLine) {
        // 离线：标记为排队状态
        log.debug('Offline, queuing message', { tempId });
        systemLog.warn(channelId, 'message.queued', 'Message queued (offline)', { messageId: tempId });
        messageStateManager.updatePendingStatus(tempId, 'queued');
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
        messageStateManager.updatePendingStatus(tempId, 'sending');

        const result = await mutation.mutateAsync({
          channelId,
          senderId: userId || 'unknown',
          senderType: 'human',
          content,
        });

        // 5. 关联服务端权威 id：使 upsertServerMessages 能精确清理乐观消息，
        //    并把权威用户消息 id 同步给 provisional 进度（供 accepted 精确认领）。
        const serverMessageId =
          (result as any)?.message_id ?? (result as any)?.messageId;
        if (serverMessageId) {
          messageStateManager.attachServerId(tempId, serverMessageId);
        }

        // 6. 成功：标记为 sent
        messageStateManager.updatePendingStatus(tempId, 'sent');

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

        messageStateManager.updatePendingStatus(tempId, 'failed', messageError);

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
      messageStateManager.updatePendingStatus(message.id, 'pending');

      // 重新发送
      send(message.channelId, message.content);
    },
    [send]
  );

  return { send, retry, isLoading: mutation.isPending };
}
