/**
 * useMessageList Hook
 * 管理频道消息列表，连接领域层和展示层
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Message } from '../domain/models/Message';
import { messageStateManager } from '../domain/MessageStateManager';

export function useMessageList(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const utils = trpc.useUtils();

  // 订阅本地状态管理器
  useEffect(() => {
    const unsubscribe = messageStateManager.subscribe(channelId, (newMessages) => {
      setMessages(newMessages);
    });
    return unsubscribe;
  }, [channelId]);

  // 订阅远程消息（React Query）
  const { data: remoteMessages, isLoading } = trpc.message.list.useQuery(
    { channelId, limit: 100 }, // 增加 limit 到 100，确保加载足够多的消息
    { enabled: !!channelId }
  );

  useEffect(() => {
    if (remoteMessages?.messages) {
      // 服务端权威正文：始终 upsert 到 serverMessages（覆盖），并清理已落库的乐观消息 / agent 进度。
      const messages = remoteMessages.messages.map((m) => Message.fromRemote(m));
      messageStateManager.upsertServerMessages(channelId, messages);
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
        // 使用 tRPC useUtils 生成正确 query key，确保 message.list 真正重新拉取。
        // （手写 queryKey 偏匹配在本仓库实测无法命中，导致实时刷新失效。）
        void utils.message.list.invalidate();
      },
    }
  );

  return { messages, isLoading };
}
