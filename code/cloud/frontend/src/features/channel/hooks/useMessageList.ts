/**
 * useMessageList Hook
 * 管理频道消息列表，连接领域层和展示层
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { Message } from '../domain/models/Message';
import { messageStateManager } from '../domain/MessageStateManager';

export function useMessageList(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const queryClient = useQueryClient();

  // 订阅本地状态管理器
  useEffect(() => {
    const unsubscribe = messageStateManager.subscribe(channelId, setMessages);
    return unsubscribe;
  }, [channelId]);

  // 订阅远程消息（React Query）
  const { data: remoteMessages, isLoading } = trpc.message.list.useQuery(
    { channelId },
    { enabled: !!channelId }
  );

  useEffect(() => {
    if (remoteMessages?.messages) {
      const messages = remoteMessages.messages.map((m) => Message.fromRemote(m));
      messageStateManager.syncRemoteMessages(channelId, messages);
    }
  }, [remoteMessages, channelId]);

  // 订阅 WebSocket 实时消息
  trpc.subscription.onMessage.useSubscription(
    {
      channelId,
      events: ['message.created', 'message.updated', 'message.deleted'],
    },
    {
      enabled: !!channelId,
      onData: () => {
        queryClient.invalidateQueries({
          queryKey: [['message', 'list'], { input: { channelId } }],
        });
      },
    }
  );

  return { messages, isLoading };
}
