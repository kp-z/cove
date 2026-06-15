/**
 * useMessageList Hook
 * 管理频道消息列表，连接领域层和展示层
 * 支持无限滚动加载历史消息
 */

import { useState, useEffect, useMemo } from 'react';
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

  // 使用无限查询支持滚动加载
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = trpc.message.list.useInfiniteQuery(
    { channelId, limit: 20 },
    {
      enabled: !!channelId,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
    }
  );

  // 合并所有页的消息
  const allRemoteMessages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.messages);
  }, [data]);

  useEffect(() => {
    if (allRemoteMessages.length > 0) {
      // 服务端权威正文：始终 upsert 到 serverMessages（覆盖），并清理已落库的乐观消息 / agent 进度。
      const messages = allRemoteMessages.map((m) => Message.fromRemote(m));
      messageStateManager.upsertServerMessages(channelId, messages);
    }
  }, [allRemoteMessages, channelId]);

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

  return {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    loadMore: fetchNextPage
  };
}
