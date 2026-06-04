import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelRight, X } from 'lucide-react';
import { ChannelTabs } from './ChannelTabs';
import { ChannelMemberBar } from './ChannelMemberBar';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Message as MessageEntity } from '@/lib/trpc-types';
import { useChannels } from '@/lib/trpc/hooks';
import { useChannelPanelStore } from '../../stores/channelStore';
import { useCurrentUser } from '@/core/auth';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentStreaming } from '../../hooks/useAgentStreaming';
import { systemLog } from '../../stores/systemEventStore';
import { Message } from '../../domain/models/Message';
import { messageStateManager } from '../../domain/MessageStateManager';

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

  const { mode, setMode, closeChannel } = useChannelPanelStore();
  const { data: channelsData, isLoading: channelLoading } = useChannels();
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();

  // 订阅 Agent 流式更新 (统一入口)
  useAgentStreaming(channel_id);

  // WebSocket 订阅：监听消息事件
  trpc.subscription.onMessage.useSubscription(
    {
      channelId: channel_id,
      events: ['message.created', 'message.updated', 'message.deleted'],
    },
    {
      onData: (event) => {
        systemLog.info(
          channel_id,
          'websocket.message_received',
          `Received ${event.eventType} event`,
          { eventType: event.eventType, messageId: event.data.message_id }
        );

        // 直接更新 MessageStateManager，不再 invalidateQueries
        if (event.eventType === 'message.created') {
          const message = Message.fromRemote(event.data);
          messageStateManager.syncRemoteMessages(channel_id, [message]);

          // 如果是 Agent 消息，流式更新已经由 useAgentStreaming 处理
          // 不需要设置 streamingMessageId
        }

        // 对于其他事件类型（updated/deleted），仍然刷新列表
        if (event.eventType !== 'message.created') {
          queryClient.invalidateQueries({
            queryKey: [['message', 'list'], { input: { channelId: channel_id } }],
          });
        }
      },
      onError: (error) => {
        systemLog.error(
          channel_id,
          'websocket.subscription_error',
          `Message subscription error: ${error.message}`,
          { error: error.message }
        );
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
        systemLog.info(
          channel_id,
          'websocket.message_received',
          `Member ${event.eventType}`,
          { eventType: event.eventType }
        );

        // 刷新成员列表
        queryClient.invalidateQueries({
          queryKey: [['channel', 'members'], { input: { channelId: channel_id } }],
        });
      },
      onError: (error) => {
        systemLog.error(
          channel_id,
          'websocket.subscription_error',
          `Member subscription error: ${error.message}`,
          { error: error.message }
        );
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
        channelId={channel_id}
        targetMessageId={message_id}
      />
      <Composer channelId={channel_id} />
    </div>
  );
}

export type { Channel, Thread, Message, ChannelPanelProps, ChannelType, MessageSender, AgentInfo } from './types';
