import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelRight, X } from 'lucide-react';
import { ChannelTabs } from './ChannelTabs';
import { ChannelMemberBar } from './ChannelMemberBar';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Message as MessageEntity } from '@/lib/trpc-types';
import { useChannels, useMessages, useSendMessage, useMessageStreaming } from '@/lib/trpc/hooks';
import { useChannelPanelStore } from '../../stores/channelStore';
import { useCurrentUser } from '@/core/auth';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import type { Message } from './types';

// UI-specific types
type ChannelType = 'public' | 'private' | 'dm' | 'thread';

interface Channel {
  channel_id: string;
  type: ChannelType;
  name: string;
  description?: string;
  unread_count: number;
  last_activity: Date;
  is_pinned: boolean;
  metadata?: {
    project_id?: string;
    workflow_id?: string;
    okr_id?: string;
    agent_id?: string;
  };
}

interface Thread {
  thread_id: string;
  channel_id: string;
  title: string;
  is_pinned: boolean;
  title_locked?: boolean;
  last_activity: Date;
  message_count: number;
  unread_count: number;
  status?: 'active' | 'archived';
  execution_id?: number;
}

interface ChannelPanelProps {
  channel_id: string;
  thread_id?: string | null;
  message_id?: string | null;
  onClose?: () => void;
  className?: string;
  hideTabs?: boolean;
}

function messageEntityToMessage(entity: MessageEntity): Message {
  return {
    message_id: entity.message_id,
    thread_id: entity.thread_id || '',
    sender: entity.sender_type === 'human' ? 'user' : entity.sender_type === 'agent' ? 'agent' : 'system',
    sender_id: entity.sender_id,
    sender_name: entity.sender_name,
    content: entity.content,
    timestamp: new Date(entity.created_at),
    is_streaming: false,
    agentMetadata: entity.agent_execution_metadata ? {
      thinking: entity.agent_execution_metadata.thinking,
      toolLogs: entity.agent_execution_metadata.tool_logs?.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        toolName: log.tool_name,
        action: log.action,
        params: log.params,
        status: log.status,
        duration: log.duration,
        result: log.result,
        meta: log.meta ? {
          fileCount: log.meta.file_count,
          linesChanged: log.meta.lines_changed,
          exitCode: log.meta.exit_code,
        } : undefined,
      })),
      usage: entity.agent_execution_metadata.usage ? {
        inputTokens: entity.agent_execution_metadata.usage.input_tokens,
        outputTokens: entity.agent_execution_metadata.usage.output_tokens,
        totalTokens: entity.agent_execution_metadata.usage.total_tokens,
        cache: entity.agent_execution_metadata.usage.cache,
        cost: entity.agent_execution_metadata.usage.cost,
        model: entity.agent_execution_metadata.usage.model,
        latency: entity.agent_execution_metadata.usage.latency,
      } : undefined,
    } : undefined,
  };
}

export function ChannelPanel({
  channel_id,
  thread_id: initialThreadId,
  message_id,
  className = '',
  hideTabs = false,
}: ChannelPanelProps) {
  const { t } = useTranslation('channel');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const { mode, setMode, closeChannel } = useChannelPanelStore();
  const { data: channelsData, isLoading: channelLoading } = useChannels();
  const { data: messagesData, isLoading: messagesLoading } = useMessages(channel_id);
  const sendMessage = useSendMessage();
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();

  // 流式更新订阅
  const streamingState = useMessageStreaming(streamingMessageId);

  // 当流式完成时，清理状态
  useEffect(() => {
    if (streamingState.status === 'completed' && streamingMessageId) {
      // 延迟清理，确保最终状态已保存
      setTimeout(() => {
        setStreamingMessageId(null);
      }, 1000);
    }
  }, [streamingState.status, streamingMessageId]);

  // WebSocket 订阅：监听消息事件
  trpc.subscription.onMessage.useSubscription(
    {
      channelId: channel_id,
      events: ['message.created', 'message.updated', 'message.deleted'],
    },
    {
      onData: (event) => {
        console.log('Received message event:', event);

        // 如果是新消息创建，且是 agent 消息，开始监听流式更新
        if (event.eventType === 'message.created' && event.data.sender_type === 'agent') {
          setStreamingMessageId(event.data.message_id);
        }

        // 刷新消息列表
        queryClient.invalidateQueries({
          queryKey: [['message', 'list'], { input: { channelId: channel_id } }],
        });
      },
      onError: (error) => {
        console.error('Subscription error:', error);
      },
    }
  );

  // WebSocket 订阅：监听成员变化事件
  trpc.subscription.onChannelMember.useSubscription(
    {
      channelId: channel_id,
      events: ['channel.member_joined', 'channel.member_left'],
    },
    {
      onData: (event) => {
        console.log('Received member event:', event);

        // 刷新成员列表
        queryClient.invalidateQueries({
          queryKey: [['channel', 'members'], { input: { channelId: channel_id } }],
        });
      },
      onError: (error) => {
        console.error('Member subscription error:', error);
      },
    }
  );

  const handleTogglePin = useCallback(() => {
    setMode(mode === 'docked' ? 'floating' : 'docked');
  }, [mode, setMode]);

  const handleClose = useCallback(() => {
    closeChannel();
  }, [closeChannel]);

  // Backend returns { channels: [...], total: number }
  const channels = channelsData?.channels || [];
  const currentChannel = channels.find(ch => ch.channel_id === channel_id);

  const channel: Channel | null = currentChannel
    ? {
        channel_id: currentChannel.channel_id,
        type: currentChannel.type as Channel['type'],
        name: currentChannel.name,
        description: currentChannel.description,
        unread_count: 0,
        last_activity: new Date(currentChannel.updated_at),
        is_pinned: currentChannel.is_pinned || false,
        metadata: { project_id: currentChannel.project_id },
      }
    : null;

  // Backend returns { messages: [...], nextCursor: string }
  const messageEntities = messagesData?.messages || [];
  let messages: Message[] = messageEntities.map(messageEntityToMessage);

  // 如果有流式更新，合并到对应的消息中
  if (streamingMessageId && streamingState.isStreaming) {
    messages = messages.map(msg => {
      if (msg.message_id === streamingMessageId) {
        return {
          ...msg,
          is_streaming: true,
          agentMetadata: {
            thinking: streamingState.thinking || msg.agentMetadata?.thinking,
            toolLogs: streamingState.toolLogs.length > 0 ? streamingState.toolLogs : msg.agentMetadata?.toolLogs,
            usage: streamingState.usage || msg.agentMetadata?.usage,
          },
        };
      }
      return msg;
    });
  }

  const handleSendMessage = useCallback(async (content: string) => {
    if (!userId) {
      console.error('Cannot send message: user not authenticated');
      return;
    }

    sendMessage.mutate({
      channelId: channel_id,
      senderId: userId,
      senderType: 'human',
      content,
      threadId: activeThreadId || undefined,
    });
  }, [channel_id, activeThreadId, sendMessage, userId]);

  const handleStopGeneration = useCallback(() => {
    // TODO: stop agent generation
  }, []);

  const handleThreadChange = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
  }, []);

  const handleNewThread = useCallback(() => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread: Thread = {
      thread_id: newThreadId,
      channel_id,
      title: t('panel.newThread'),
      is_pinned: false,
      last_activity: new Date(),
      message_count: 0,
      unread_count: 0,
      status: 'active',
    };
    setThreads((prev) => [...prev, newThread]);
    setActiveThreadId(newThreadId);
  }, [channel_id, t]);

  const handleCloseThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.thread_id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
  }, [activeThreadId]);

  // 左侧操作按钮（悬浮和关闭）
  const leftActions = (
    <>
      <button
        onClick={handleTogglePin}
        className="p-1.5 rounded hover:bg-white/10 transition-colors"
        title={mode === 'docked' ? t('panel.float') : t('panel.dock')}
      >
        <PanelRight
          className={`w-4 h-4 ${mode === 'docked' ? 'text-gray-400' : 'text-blue-400'}`}
        />
      </button>
      <button
        onClick={handleClose}
        className="p-1.5 rounded hover:bg-white/10 transition-colors"
        title={t('panel.close')}
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </>
  );

  // 加载态：显示 ChannelTabs 和按钮，但内容区域显示加载中
  if (channelLoading || !channel) {
    return (
      <div className={`flex flex-col h-full bg-[#1a1d2e] ${className}`}>
        <div className="flex items-center gap-2 px-2 py-1 border-b border-white/10">
          <div className="shrink-0 flex items-center gap-1">
            {leftActions}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <div className="px-3 py-1.5 text-xs text-gray-400">
              {t('common:loading')}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">{t('common:loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[#1a1d2e] ${className}`}>
      {!hideTabs && (
        <ChannelTabs
          channel={channel}
          threads={threads}
          activeThreadId={activeThreadId}
          onThreadChange={handleThreadChange}
          onNewThread={handleNewThread}
          onCloseThread={handleCloseThread}
          leftActions={leftActions}
        />
      )}
      <ChannelMemberBar channelId={channel_id} />
      <MessageList
        messages={messages}
        isLoading={messagesLoading}
        targetMessageId={message_id}
      />
      <Composer
        threadId={activeThreadId || channel_id}
        isGenerating={sendMessage.isPending}
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
      />
    </div>
  );
}

export type { Channel, Thread, Message, ChannelPanelProps, ChannelType, MessageSender, AgentInfo } from './types';
