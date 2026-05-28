import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Message } from '../../domain/models/Message';
import { MessageBubble } from './MessageBubbleNew';
import { SystemMessage } from './SystemMessage';
import { TypingIndicator } from './TypingIndicator';
import { useMessageList, useSendMessage, useTypingState } from '../../hooks';

interface MessageListProps {
  channelId: string;
  className?: string;
  targetMessageId?: string | null;
}

function shouldShowDateSeparator(currentMsg: Message, prevMsg?: Message): boolean {
  if (!prevMsg) return true;

  const currentDate = new Date(currentMsg.timestamp).toDateString();
  const prevDate = new Date(prevMsg.timestamp).toDateString();

  return currentDate !== prevDate;
}

function shouldGroupMessage(currentMsg: Message, prevMsg?: Message): boolean {
  if (!prevMsg) return false;

  if (currentMsg.senderType !== prevMsg.senderType || currentMsg.senderName !== prevMsg.senderName) {
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

export function MessageList({ channelId, className = '', targetMessageId }: MessageListProps) {
  const { t } = useTranslation('channel');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用新的 hooks
  const { messages, isLoading } = useMessageList(channelId);
  const { retry } = useSendMessage();
  const { typingUsers } = useTypingState(channelId);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current && !targetMessageId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, targetMessageId]);

  // 滚动到特定消息
  useEffect(() => {
    if (targetMessageId && messages.length > 0) {
      const messageElement = document.getElementById(`message-${targetMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          <React.Fragment key={message.id}>
            {showDateSeparator && <DateSeparator date={message.timestamp} />}

            {message.senderType === 'system' ? (
              <SystemMessage message={message} />
            ) : (
              <div id={`message-${message.messageId || message.id}`} className="transition-all duration-300">
                <MessageBubble
                  message={message}
                  isGrouped={isGrouped}
                  t={t}
                  onRetry={() => retry(message)}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* 正在输入指示器 */}
      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

      <div ref={messagesEndRef} />
    </div>
  );
}
