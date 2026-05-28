/**
 * MessageBubble 组件
 * 显示单条消息气泡
 */

import React, { useState, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { Avatar, useEntityAvatarData } from '@/shared/components/display/Avatar';
import { AgentExecutionModal, type TabType } from './MessageBubble/AgentExecution/AgentExecutionModal';
import { MessageStatus } from './MessageStatus';
import { Message } from '../../domain/models/Message';
import { MessageHoverActions, getDefaultConfig } from './MessageBubble/HoverActions';

interface MessageBubbleProps {
  message: Message;
  isGrouped: boolean;
  t: TFunction;
  onRetry: () => void;
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
    return (
      t('common:time.yesterday') +
      ' ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  }

  return (
    date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) +
    ' ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

export function MessageBubble({ message, isGrouped, t, onRetry }: MessageBubbleProps) {
  const isUser = message.senderType === 'user';
  const isAgent = message.senderType === 'agent';
  const isPending = message.isPending();
  const isFailed = message.isFailed();

  const entityType = isAgent ? 'agent' : 'user';
  const avatarData = useEntityAvatarData(entityType, message.senderId || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<TabType | undefined>(undefined);

  const handleOpenModal = useCallback((tab?: TabType) => {
    setDefaultTab(tab);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setDefaultTab(undefined);
  }, []);

  const handleEdit = useCallback(() => {
    // TODO: 实现编辑消息功能
    console.log('Edit message:', message.id);
  }, [message.id]);

  const handleDelete = useCallback(() => {
    // TODO: 实现删除消息功能
    console.log('Delete message:', message.id);
  }, [message.id]);

  const handleReply = useCallback(() => {
    // TODO: 实现回复消息功能
    console.log('Reply to message:', message.id);
  }, [message.id]);

  const hoverActionsConfig = getDefaultConfig(
    message,
    handleOpenModal,
    handleEdit,
    handleDelete,
    handleReply
  );

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
        isGrouped ? 'mt-1' : 'mt-3'
      }`}
    >
      {/* Avatar for agent (left side) */}
      {!isUser && !isGrouped && (
        <Avatar
          src={avatarData.avatarUrl}
          alt={message.senderName}
          type={entityType}
          size="sm"
          className="mr-2 mt-1"
        />
      )}

      <div className={`relative group ${isUser ? 'max-w-[95%]' : 'max-w-[95%]'}`}>
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className={`text-xs font-medium ${
              isUser ? 'text-blue-400' : isAgent ? 'text-purple-400' : 'text-gray-400'
            }`}>
              {message.senderName}
            </span>
            <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp, t)}</span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm overflow-hidden break-words transition-all duration-200 ${
            'bg-black/70 border border-white/10 text-gray-100'
          } ${isPending ? 'opacity-70' : 'opacity-100'} ${
            isFailed ? 'border-2 border-red-500/50 opacity-90' : ''
          } ${!isPending && !isFailed && message.source === 'remote' ? 'animate-fade-in' : ''}`}
        >
          <div className="prose prose-sm prose-invert max-w-none text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {/* Hover Actions - aligned with avatar */}
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <MessageHoverActions message={message} config={hoverActionsConfig} />
        </div>

        {/* Status indicator for user messages */}
        {isUser && <MessageStatus message={message} onRetry={onRetry} />}
      </div>

      {/* Avatar for user (right side) */}
      {isUser && !isGrouped && (
        <Avatar
          src={avatarData.avatarUrl}
          alt={message.senderName}
          type={entityType}
          size="sm"
          className="ml-2 mt-1"
        />
      )}

      {/* Agent Execution Modal */}
      {isAgent && message.agentMetadata && (
        <AgentExecutionModal
          metadata={message.agentMetadata}
          isStreaming={false}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          defaultTab={defaultTab}
        />
      )}
    </div>
  );
}
