/**
 * MessageBubble 组件 - Discord 风格
 * 其他用户/Agent 左对齐，当前用户右对齐
 * 用户名用不同颜色区分
 */

import React, { useState, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { Avatar, useEntityAvatarData } from '@/shared/components/display/Avatar';
import { AgentExecutionModal, type TabType } from './MessageBubble/AgentExecution/AgentExecutionModal';
import { MessageStatus } from './MessageStatus';
import { Message } from '../../domain/models/Message';
import { MessageHoverActions, getDefaultConfig } from './MessageBubble/HoverActions';
import { getUserColor, getColorWithOpacity } from '@/shared/utils/userColor';
import { useAuthStore } from '@/core/auth/authStore';

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
  const { userId: currentUserId } = useAuthStore();
  const isCurrentUser = message.senderType === 'user' && message.senderId === currentUserId;
  const isAgent = message.senderType === 'agent';
  const isPending = message.isPending();
  const isFailed = message.isFailed();

  const entityType = isAgent ? 'agent' : 'user';
  const avatarData = useEntityAvatarData(entityType, message.senderId || '');
  const userColor = getUserColor(message.senderId || message.senderName);
  const borderColor = getColorWithOpacity(userColor, 0.15); // 15% opacity for subtle border

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
    console.log('Edit message:', message.id);
  }, [message.id]);

  const handleDelete = useCallback(() => {
    console.log('Delete message:', message.id);
  }, [message.id]);

  const handleReply = useCallback(() => {
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
      className={`group relative flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
        isGrouped ? 'mt-0.5' : 'mt-4'
      } px-4 py-1`}
    >
      {/* Left side - Avatar and content for non-current-user */}
      {!isCurrentUser && (
        <>
          {/* Avatar placeholder - always reserve space */}
          <div className="flex-shrink-0 w-10 mr-3">
            {!isGrouped && (
              <Avatar
                src={avatarData.avatarUrl}
                alt={message.senderName}
                type={entityType}
                size="sm"
                className="w-10 h-10"
              />
            )}
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0 max-w-[70%]">
            {/* Header: Username and timestamp */}
            {!isGrouped && (
              <div className="flex items-baseline gap-2 mb-1 px-1">
                <span
                  className="text-sm font-semibold"
                  style={{ color: userColor }}
                >
                  {message.senderName}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(message.timestamp, t)}
                </span>
              </div>
            )}

            {/* Message bubble with left tail */}
            <div className="relative">
              <div
                className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 bg-white/[0.05] border ${
                  isPending ? 'opacity-70' : 'opacity-100'
                } ${isFailed ? 'border-2 border-red-500/50' : ''} hover:bg-white/[0.08]`}
                style={{ borderColor: isFailed ? undefined : borderColor }}
              >
                <div className={`text-sm text-gray-100 leading-relaxed whitespace-pre-wrap break-words ${
                  isFailed ? 'text-red-400' : ''
                }`}>
                  {message.content}
                </div>
              </div>

              {/* Rounded tail pointing left to avatar */}
              {!isGrouped && (
                <div className="absolute left-0 bottom-[10px] -translate-x-[14px] w-0 h-0">
                  <div
                    className="absolute w-[15px] h-[30px] rounded-tr-[20px]"
                    style={{
                      borderTop: `9px solid ${borderColor}`,
                      transform: 'rotate(145deg)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Hover actions */}
            <div className="mt-1">
              <MessageHoverActions message={message} config={hoverActionsConfig} />
            </div>
          </div>
        </>
      )}

      {/* Right side - Current user messages */}
      {isCurrentUser && (
        <>
          {/* Message content */}
          <div className="flex-1 min-w-0 max-w-[70%] flex flex-col items-end">
            {/* Header: Timestamp and username */}
            {!isGrouped && (
              <div className="flex items-baseline gap-2 mb-1 px-1">
                <span className="text-xs text-gray-500">
                  {formatTimestamp(message.timestamp, t)}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: userColor }}
                >
                  {message.senderName}
                </span>
              </div>
            )}

            {/* Message bubble with right tail */}
            <div className="relative">
              <div
                className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 bg-white/[0.05] border ${
                  isPending ? 'opacity-70' : 'opacity-100'
                } ${isFailed ? 'border-2 border-red-500/50' : ''} hover:bg-white/[0.08]`}
                style={{ borderColor: isFailed ? undefined : borderColor }}
              >
                <div className={`text-sm text-gray-100 leading-relaxed whitespace-pre-wrap break-words ${
                  isFailed ? 'text-red-400' : ''
                }`}>
                  {message.content}
                </div>
              </div>

              {/* Rounded tail pointing right to avatar */}
              {!isGrouped && (
                <div className="absolute right-0 bottom-[10px] translate-x-[14px] w-0 h-0">
                  <div
                    className="absolute w-[15px] h-[30px] rounded-tr-[20px]"
                    style={{
                      borderTop: `9px solid ${borderColor}`,
                      transform: 'rotate(45deg) scaleY(-1)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Hover actions and status */}
            <div className="flex items-center gap-2 mt-1">
              <MessageStatus message={message} onRetry={onRetry} />
              <MessageHoverActions message={message} config={hoverActionsConfig} />
            </div>
          </div>

          {/* Avatar placeholder - always reserve space */}
          <div className="flex-shrink-0 w-10 ml-3">
            {!isGrouped && (
              <Avatar
                src={avatarData.avatarUrl}
                alt={message.senderName}
                type={entityType}
                size="sm"
                className="w-10 h-10"
              />
            )}
          </div>
        </>
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
