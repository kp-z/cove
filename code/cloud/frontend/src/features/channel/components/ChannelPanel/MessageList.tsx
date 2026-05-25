import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Message } from './types';
import { Avatar, useEntityAvatarData } from '@/shared/components/display/Avatar';
import { AgentExecutionPanel } from './MessageBubble/AgentExecution';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
  targetMessageId?: string | null;
}

function formatTimestamp(date: Date, t: TFunction): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return t('common:time.justNow');
  }

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return t('common:time.minutesAgo', { count: minutes });
  }

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return t('common:time.yesterday') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) + ' ' +
         date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function shouldShowDateSeparator(currentMsg: Message, prevMsg?: Message): boolean {
  if (!prevMsg) return true;

  const currentDate = new Date(currentMsg.timestamp).toDateString();
  const prevDate = new Date(prevMsg.timestamp).toDateString();

  return currentDate !== prevDate;
}

function shouldGroupMessage(currentMsg: Message, prevMsg?: Message): boolean {
  if (!prevMsg) return false;

  if (currentMsg.sender !== prevMsg.sender || currentMsg.sender_name !== prevMsg.sender_name) {
    return false;
  }

  const timeDiff = new Date(currentMsg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime();
  if (timeDiff > 300000) {
    return false;
  }

  return true;
}

function DateSeparator({ date }: { date: Date }) {
  const { t } = useTranslation('common');
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const label = isToday
    ? t('time.today')
    : isYesterday
    ? t('time.yesterday')
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex-1 h-px bg-white/5" />
      <span className="px-3 text-xs text-gray-600">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function MessageBubble({ message, isGrouped, t }: { message: Message; isGrouped: boolean; t: TFunction }) {
  const isUser = message.sender === 'user';
  const isAgent = message.sender === 'agent';
  const isSystem = message.sender === 'system';

  // Fetch avatar data for non-user messages
  const avatarData = useEntityAvatarData(
    isAgent ? 'agent' : 'user',
    message.sender_id
  );

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-3'}`}>
      {/* Avatar for agent/system (left side) */}
      {!isUser && !isGrouped && (
        <Avatar
          avatarUrl={avatarData.avatarUrl}
          name={message.sender_name}
          size="sm"
          className="mr-2 mt-1"
        />
      )}

      <div className={`relative group ${isUser ? 'max-w-[95%]' : 'max-w-[95%]'}`}>
        {!isGrouped && !isUser && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className={`text-xs font-medium ${
              isAgent ? 'text-purple-400' : 'text-gray-400'
            }`}>
              {message.sender_name}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(message.timestamp, t)}
            </span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm overflow-hidden break-words ${
            isSystem
              ? 'bg-black/50 border border-white/10 text-gray-400 text-sm italic'
              : isUser
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : 'bg-black/70 border border-purple-500/40 text-gray-100'
          }`}
        >
          {message.is_streaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
          )}

          <div className="prose prose-sm prose-invert max-w-none text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Agent Execution Panel - only for agent messages */}
          {isAgent && message.agentMetadata && (
            <AgentExecutionPanel
              metadata={message.agentMetadata}
              isStreaming={message.is_streaming}
            />
          )}
        </div>

        {isUser && !isGrouped && (
          <div className="text-xs text-gray-500 mt-1 px-1 text-right">
            {formatTimestamp(message.timestamp, t)}
          </div>
        )}
      </div>

      {/* Avatar for user (right side) */}
      {isUser && !isGrouped && (
        <Avatar
          avatarUrl={avatarData.avatarUrl}
          name={message.sender_name}
          size="sm"
          className="ml-2 mt-1"
        />
      )}
    </div>
  );
}

export function MessageList({ messages, isLoading, className = '', targetMessageId }: MessageListProps) {
  const { t } = useTranslation('channel');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current && !targetMessageId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, targetMessageId]);

  // 滚动到特定消息
  useEffect(() => {
    if (targetMessageId && messages.length > 0) {
      const messageElement = document.getElementById(`message-${targetMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 添加高亮效果
        messageElement.classList.add('highlight-message');
        setTimeout(() => messageElement.classList.remove('highlight-message'), 2000);
      }
    }
  }, [targetMessageId, messages]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto px-4 py-4 bg-[#1a1d2e] space-y-0 ${className}`}
    >
      {isLoading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-sm">{t('common:loading')}</div>
        </div>
      )}

      {!isLoading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">{t('messageList.emptyTitle')}</p>
          <p className="text-xs mt-1 text-gray-600">{t('messageList.emptyDescription')}</p>
        </div>
      )}

      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : undefined;
        const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
        const isGrouped = shouldGroupMessage(message, prevMessage);

        return (
          <React.Fragment key={message.message_id}>
            {showDateSeparator && <DateSeparator date={message.timestamp} />}
            <div id={`message-${message.message_id}`} className="transition-all duration-300">
              <MessageBubble message={message} isGrouped={isGrouped} t={t} />
            </div>
          </React.Fragment>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
