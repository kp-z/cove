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
  const utils = trpc.useUtils();
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
        // 活动感知超时兜底已下沉到 manager 的 startAgentProgress：任意后端进度事件都会取消
        // 占位超时，占位绝不中途消失；仅 30s 内全程无事件的「真卡死 pending」才被清理。
        messageStateManager.startAgentProgress(channelId, {
          repliesToLocalId: tempId,
          agentId: replyAgent.agentId,
          agentName: replyAgent.agentName || 'Agent',
        });
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

        // 7. 触发 lastMessage 缓存失效，更新 channel list 内的最后消息预览文案
        queryClient.invalidateQueries({
          queryKey: [['message', 'getLastByChannel'], { input: { channelId } }],
        });

        // 8. 根因修复：消息发送会刷新后端 Channel 的 meta.updated_at（用于
        //    列表排序 / "最近更新"角标），但此前从未失效 channel.list 查询，
        //    导致必须整页刷新才能看到新的排序/角标。
        //    必须用 utils.channel.list.invalidate()（而非手写 queryKey 做
        //    partial 匹配）——本仓库已验证手写 partial queryKey 无法可靠命中
        //    查询（见 useAgentStreaming.ts 中 invalidateMessageList 的说明）。
        void utils.channel.list.invalidate();

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
    [userId, user?.display_name, user?.username, mutation, queryClient, utils]
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
