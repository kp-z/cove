import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChannelTabs } from './ChannelTabs';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Message as MessageEntity } from '@/lib/trpc-types';
import { useChannels, useMessages, useSendMessage } from '@/lib/trpc/hooks';

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

type MessageSender = 'user' | 'agent' | 'system';

interface Message {
  message_id: string;
  thread_id: string;
  sender: MessageSender;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  timestamp: Date;
  is_streaming?: boolean;
}

interface ChannelPanelProps {
  channel_id: string;
  thread_id?: string | null;
  onClose?: () => void;
  className?: string;
}

function messageEntityToMessage(entity: MessageEntity): Message {
  return {
    message_id: entity.message_id,
    thread_id: entity.thread_id || '',
    sender: entity.sender_type === 'human' ? 'user' : entity.sender_type === 'agent' ? 'agent' : 'system',
    sender_name: entity.sender_id,
    content: entity.content,
    timestamp: new Date(entity.created_at),
    is_streaming: false,
  };
}

export function ChannelPanel({
  channel_id,
  thread_id: initialThreadId,
  className = '',
}: ChannelPanelProps) {
  const { t } = useTranslation('channel');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);

  const { data: channelData, isLoading: channelLoading } = useChannels();
  const { data: messageEntities, isLoading: messagesLoading } = useMessages(channel_id, activeThreadId);
  const sendMessage = useSendMessage();

  const channel: Channel | null = channelData
    ? {
        channel_id: channelData.channel_id,
        type: channelData.type as Channel['type'],
        name: channelData.name,
        description: channelData.description,
        unread_count: 0,
        last_activity: new Date(channelData.updated_at),
        is_pinned: false,
        metadata: { project_id: channelData.project_id },
      }
    : null;

  const messages: Message[] = (messageEntities?.messages ?? []).map(messageEntityToMessage);

  const handleSendMessage = useCallback(async (content: string) => {
    sendMessage.mutate({
      channel_id,
      sender_id: 'current-user-id',
      sender_type: 'human',
      content,
      thread_id: activeThreadId || undefined,
    });
  }, [channel_id, activeThreadId, sendMessage]);

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

  if (channelLoading || !channel) {
    return (
      <div className={`flex items-center justify-center h-full bg-[#1a1d2e] ${className}`}>
        <div className="text-gray-400">{t('common:loading')}</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[#1a1d2e] ${className}`}>
      <ChannelTabs
        channel={channel}
        threads={threads}
        activeThreadId={activeThreadId}
        onThreadChange={handleThreadChange}
        onNewThread={handleNewThread}
        onCloseThread={handleCloseThread}
      />
      <MessageList
        messages={messages}
        isLoading={messagesLoading}
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
