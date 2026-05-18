/**
 * useTimelineNodes - 数据适配 Hook
 *
 * 将 messages 和 threads 数据转换为 Timeline 节点格式
 */

import { useMemo } from 'react';
import { useMessages } from '@/lib/trpc/hooks/message.hooks';
import { useChannelThreads } from '@/lib/trpc/hooks/thread.hooks';
import type { TimelineNode } from '../NodeRegistry';

export interface UseTimelineNodesOptions {
  channelId: string;
  limit?: number;
}

export function useTimelineNodes({ channelId, limit = 50 }: UseTimelineNodesOptions) {
  // 获取 messages 数据
  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useMessages(channelId, { limit });

  // 获取 threads 数据
  const {
    data: threadsResponse,
    isLoading: isLoadingThreads,
    error: threadsError,
  } = useChannelThreads(channelId);

  // 合并和转换数据
  const nodes = useMemo(() => {
    const timelineNodes: TimelineNode[] = [];

    // 转换 messages 为节点
    if (messagesResponse?.messages) {
      messagesResponse.messages.forEach((message: any) => {
        timelineNodes.push({
          type: 'message',
          id: message.message_id,
          timestamp: message.created_at,
          data: {
            message_id: message.message_id,
            content: message.content,
            sender: {
              user_id: message.sender_id,
              display_name: message.sender?.display_name || 'Unknown',
              avatar: message.sender?.avatar,
            },
          },
        });
      });
    }

    // 转换 threads 为节点
    if (threadsResponse?.threads) {
      threadsResponse.threads.forEach((thread: any) => {
        timelineNodes.push({
          type: 'thread',
          id: thread.thread_id || thread.parent_message_id,
          timestamp: thread.last_reply_at || thread.created_at,
          data: {
            thread_id: thread.thread_id || thread.parent_message_id,
            parent_message_id: thread.parent_message_id,
            title: thread.title || thread.first_message?.content || 'Untitled Thread',
            reply_count: thread.reply_count || 0,
            last_reply_at: thread.last_reply_at,
          },
        });
      });
    }

    // 按时间倒序排序（最新的在前）
    return timelineNodes.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [messagesResponse, threadsResponse]);

  return {
    nodes,
    isLoading: isLoadingMessages || isLoadingThreads,
    error: messagesError || threadsError,
  };
}
