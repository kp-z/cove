import { trpc } from '@/lib/trpc';
import { notify } from '@/core/services/notificationService';
import { useEffect, useState } from 'react';
import { systemLog } from '@/features/channel/stores/systemEventStore';

export function useSendMessage() {
  const utils = trpc.useUtils();

  return trpc.message.send.useMutation({
    onMutate: (variables) => {
      console.log('[useSendMessage] Mutation started', {
        channelId: variables.channelId,
        senderId: variables.senderId,
        contentLength: variables.content.length,
      });
    },
    onSuccess: (_data, variables) => {
      console.log('[useSendMessage] Mutation succeeded', {
        messageId: _data.message_id,
        channelId: variables.channelId,
      });
      utils.message.list.invalidate({ channelId: variables.channelId });
      // Toast 已移除：新架构通过 MessageStatus 组件显示状态
    },
    onError: (error) => {
      console.error('[useSendMessage] Mutation failed', {
        error: error.message,
        code: error.data?.code,
      });
      // Toast 已移除：新架构通过 MessageStatus 组件显示错误
      // 仅保留系统级错误（如权限错误）的 Toast
      if (error.data?.code === 'FORBIDDEN' || error.data?.code === 'UNAUTHORIZED') {
        notify.toast.error('Permission denied', error.message || 'You do not have permission to send messages');
      }
    },
  });
}

export function useMessages(channelId: string, options?: { limit?: number; cursor?: string }) {
  const query = trpc.message.list.useQuery(
    {
      channelId,
      limit: options?.limit ?? 20,
      cursor: options?.cursor,
    },
    {
      queryKey: ['messages', channelId, options],
      enabled: !!channelId,
      onSuccess: (data) => {
        systemLog.info(
          channelId,
          'query.messages.success',
          `Fetched ${data.messages?.length || 0} messages`,
          { messageCount: data.messages?.length || 0, total: data.total }
        );
      },
      onError: (error: any) => {
        systemLog.error(
          channelId,
          'query.messages.error',
          `Failed to fetch messages: ${error.message}`,
          { error: error.message }
        );
      },
    }
  );

  // 记录查询开始
  useEffect(() => {
    if (query.isFetching && !query.data) {
      systemLog.info(channelId, 'query.messages.start', 'Fetching messages...', { channelId });
    }
  }, [query.isFetching, query.data, channelId]);

  return query;
}

export function useMessage(messageId: string) {
  return trpc.message.getById.useQuery(
    { messageId },
    {
      enabled: !!messageId,
    }
  );
}

export function useUpdateMessage() {
  const utils = trpc.useUtils();

  return trpc.message.update.useMutation({
    onSuccess: (data) => {
      utils.message.getById.invalidate({ messageId: data.message_id });
      utils.message.list.invalidate({ channelId: data.channel_id });
      notify.toast.success('Message updated', 'Your message has been updated successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to update message', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteMessage() {
  const utils = trpc.useUtils();

  return trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate();
      notify.toast.success('Message deleted', 'The message has been deleted successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to delete message', error.message || 'An unexpected error occurred');
    },
  });
}

export function useAddReaction() {
  const utils = trpc.useUtils();

  return trpc.message.addReaction.useMutation({
    onSuccess: (data) => {
      utils.message.getById.setData({ messageId: data.message_id }, data);
    },
    onError: (error) => {
      notify.toast.error('Failed to add reaction', error.message || 'An unexpected error occurred');
    },
  });
}

export function useRemoveReaction() {
  const utils = trpc.useUtils();

  return trpc.message.removeReaction.useMutation({
    onSuccess: (data) => {
      utils.message.getById.setData({ messageId: data.message_id }, data);
    },
    onError: (error) => {
      notify.toast.error('Failed to remove reaction', error.message || 'An unexpected error occurred');
    },
  });
}

export function useReplyToThread() {
  const utils = trpc.useUtils();

  return trpc.message.replyToThread.useMutation({
    onSuccess: (_data, variables) => {
      utils.message.getThreadMessages.invalidate({ parentMessageId: variables.parentMessageId });
      notify.toast.success('Reply sent', 'Your reply has been sent successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to send reply', error.message || 'An unexpected error occurred');
    },
  });
}

export function useThreadMessages(parentMessageId: string) {
  return trpc.message.getThreadMessages.useQuery(
    { parentMessageId },
    {
      enabled: !!parentMessageId,
    }
  );
}

export interface StreamingEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: {
    messageId: string;
    sequence: number;
    timestamp: string;
    thinking?: string;
    toolLog?: {
      id: string;
      timestamp: string;
      toolName: string;
      action: string;
      params?: Record<string, unknown>;
      status: 'pending' | 'running' | 'success' | 'error';
      duration?: number;
      result?: {
        success?: string;
        error?: string;
        output?: string;
      };
      meta?: {
        fileCount?: number;
        linesChanged?: number;
        exitCode?: number;
      };
    };
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cache?: {
        creationTokens: number;
        readTokens: number;
        hitRate?: number;
      };
      cost?: {
        inputCost: number;
        outputCost: number;
        cacheCost: number;
        totalCost: number;
      };
      model?: string;
      latency?: {
        firstTokenMs?: number;
        totalMs?: number;
        tokensPerSecond?: number;
      };
    };
    streamingStatus?: 'thinking' | 'tool_use' | 'responding' | 'completed';
  };
}

export interface MessageStreamingState {
  thinking: string;
  toolLogs: StreamingEvent['data']['toolLog'][];
  usage: StreamingEvent['data']['usage'] | null;
  status: 'thinking' | 'tool_use' | 'responding' | 'completed' | 'idle';
  isStreaming: boolean;
}

export function useMessageStreaming(messageId: string | null) {
  const [state, setState] = useState<MessageStreamingState>({
    thinking: '',
    toolLogs: [],
    usage: null,
    status: 'idle',
    isStreaming: false,
  });

  const subscription = trpc.subscription.onMessageStreaming.useSubscription(
    { messageId: messageId || '' },
    {
      enabled: !!messageId,
      onData: (event: StreamingEvent) => {
        setState((prev) => {
          const newState = { ...prev, isStreaming: true };

          switch (event.eventType) {
            case 'message.streaming.thinking':
              if (event.data.thinking) {
                newState.thinking = prev.thinking + event.data.thinking;
              }
              break;

            case 'message.streaming.tool_log':
              if (event.data.toolLog) {
                newState.toolLogs = [...prev.toolLogs, event.data.toolLog];
              }
              break;

            case 'message.streaming.usage':
              if (event.data.usage) {
                newState.usage = event.data.usage;
              }
              break;

            case 'message.streaming.status':
              if (event.data.streamingStatus) {
                newState.status = event.data.streamingStatus;
                if (event.data.streamingStatus === 'completed') {
                  newState.isStreaming = false;
                }
              }
              break;
          }

          return newState;
        });
      },
      onError: (error) => {
        console.error('Streaming error:', error);
        setState((prev) => ({ ...prev, isStreaming: false, status: 'idle' }));
      },
    }
  );

  useEffect(() => {
    if (!messageId) {
      setState({
        thinking: '',
        toolLogs: [],
        usage: null,
        status: 'idle',
        isStreaming: false,
      });
    }
  }, [messageId]);

  return state;
}
