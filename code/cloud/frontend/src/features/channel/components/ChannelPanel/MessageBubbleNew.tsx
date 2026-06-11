/**
 * MessageBubble 组件 - Discord 风格
 * 其他用户/Agent 左对齐，当前用户右对齐
 * 用户名用不同颜色区分
 * 支持流式更新显示
 */

import { useState, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { Coins } from 'lucide-react';
import { Avatar, useEntityAvatarData } from '@/shared/components/display/Avatar';
import { AgentExecutionModal, type TabType } from './MessageBubble/AgentExecution/AgentExecutionModal';
import { MessageStatus } from './MessageStatus';
import { Message } from '../../domain/models/Message';
import { MessageHoverActions, getDefaultConfig } from './MessageBubble/HoverActions';
import { computeMessageCostUsd, formatCostUsd } from './MessageBubble/usageCost';
import { getUserColor, getColorWithOpacity } from '@/shared/utils/userColor';
import { useAuthStore } from '@/core/auth/authStore';
import { StreamingContent } from './StreamingContent';
import { ToolCallIndicator } from './ToolCallIndicator';
import { StreamingStatusIndicator } from './StreamingStatusIndicator';
import { mapStreamingPhaseToAvatarStatus } from './avatarStatus';

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

  // TODO: 实现编辑/删除/回复
  const handleEdit = useCallback(() => {}, []);

  const handleDelete = useCallback(() => {}, []);

  const handleReply = useCallback(() => {}, []);

  const hoverActionsConfig = getDefaultConfig(
    message,
    handleOpenModal,
    handleEdit,
    handleDelete,
    handleReply
  );

  // 单条 agent 消息的美元成本（仅在 hover 操作行内展示）
  const messageCostUsd = isAgent ? computeMessageCostUsd(message.agentMetadata?.usage) : null;

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
                // 仅 agent 头像接入状态胶囊：由流式阶段/失败态映射而来；非 agent 不显示
                status={isAgent ? mapStreamingPhaseToAvatarStatus(message.streamingPhase, isFailed) : undefined}
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
                className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                  isPending ? 'opacity-70' : 'opacity-100'
                } ${isFailed ? 'border-2 border-red-500/50' : ''} hover:bg-white/[0.08] ${
                  message.streamingPhase === 'pending' ? 'bg-gray-500/10 border border-gray-500/20' :
                  message.streamingPhase === 'thinking' ? 'bg-blue-500/10 border border-blue-500/20' :
                  message.streamingPhase === 'tool_use' ? 'bg-purple-500/10 border border-purple-500/20' :
                  'bg-white/[0.05] border'
                }`}
                style={{ borderColor: isFailed ? undefined : (message.streamingPhase ? undefined : borderColor) }}
              >
                {/* 统一的状态指示器 */}
                {(message.streamingPhase === 'pending' ||
                  message.streamingPhase === 'accepted' ||
                  message.streamingPhase === 'thinking' ||
                  message.streamingPhase === 'tool_use' ||
                  message.streamingPhase === 'responding') && (
                  <StreamingStatusIndicator
                    phase={message.streamingPhase}
                    currentTool={message.streamingData?.currentTool}
                    // 传入占位起始时间（= progress.startedAt，promote 重键时保留），
                    // 使「已等待 Ns」跨 pending→accepted 重挂载保持连续，不再归零。
                    startedAt={message.timestamp}
                  />
                )}

                {/* tool_use 阶段：仅显示工具调用（思考过程 UI 已移除）*/}
                {message.streamingPhase === 'tool_use' && message.streamingData?.currentTool && (
                  <ToolCallIndicator
                    toolName={message.streamingData.currentTool.name}
                    params={message.streamingData.currentTool.params}
                  />
                )}

                {/* responding 阶段：流式显示回复（思考过程 UI 已移除）*/}
                {message.streamingPhase === 'responding' && (
                  <div className="text-sm text-gray-100 leading-relaxed">
                    <StreamingContent
                      content={message.streamingData?.partialContent || message.content}
                      isStreaming={true}
                      skipAnimation={message.skipAnimation}
                    />
                  </div>
                )}

                {/* completed 或无 phase：显示完整内容（思考过程 UI 已移除）*/}
                {(!message.streamingPhase || message.streamingPhase === 'completed') && (
                  <div className={`text-sm text-gray-100 leading-relaxed whitespace-pre-wrap break-words ${
                    isFailed ? 'text-red-400' : ''
                  }`}>
                    {message.content}
                  </div>
                )}

                {/* pending 或 accepted 阶段：只显示状态，无内容 */}
                {(message.streamingPhase === 'pending' || message.streamingPhase === 'accepted') && (
                  <div className="h-4"></div>
                )}
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

            {/* Hover actions：操作按钮与单条消息成本同行，仅 hover 时显示 */}
            <div className="mt-1">
              <MessageHoverActions
                message={message}
                config={hoverActionsConfig}
                trailing={
                  isAgent && message.hasUsageStats() && !message.isStreaming() ? (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('usage')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors tabular-nums"
                      title="本条消息花费（点击查看用量详情）"
                    >
                      <Coins className="w-3 h-3" />
                      {formatCostUsd(messageCostUsd ?? 0)}
                    </button>
                  ) : undefined
                }
              />
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
                className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                  isPending ? 'opacity-70' : 'opacity-100'
                } ${isFailed ? 'border-2 border-red-500/50' : ''} hover:bg-white/[0.08] ${
                  message.streamingPhase === 'thinking' ? 'bg-blue-500/10 border border-blue-500/20' :
                  message.streamingPhase === 'tool_use' ? 'bg-purple-500/10 border border-purple-500/20' :
                  'bg-white/[0.05] border'
                }`}
                style={{ borderColor: isFailed ? undefined : (message.streamingPhase ? undefined : borderColor) }}
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
