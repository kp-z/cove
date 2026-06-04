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
    console.log('[useMessageList] Subscribing to channel:', channelId);
    const unsubscribe = messageStateManager.subscribe(channelId, (newMessages) => {
      console.log('[useMessageList] Received message update for channel:', channelId);
      console.log('[useMessageList] New messages count:', newMessages.length);
      console.log('[useMessageList] Messages:', newMessages.map(m => ({ id: m.id, content: m.content.substring(0, 30), status: m.status })));
      setMessages(newMessages);
    });
    console.log('[useMessageList] Subscription established for channel:', channelId);
    return unsubscribe;
  }, [channelId]);

  // 订阅远程消息（React Query）
  const { data: remoteMessages, isLoading } = trpc.message.list.useQuery(
    { channelId, limit: 100 }, // 增加 limit 到 100，确保加载足够多的消息
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
