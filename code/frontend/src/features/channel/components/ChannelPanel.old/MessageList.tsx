/**
 * MessageList 组件
 *
 * 显示对话消息列表，支持滚动和流式输出
 * 位于 AgentInfoBar 下方，占据主要空间
 *
 * 功能：
 * - 显示消息列表（用户消息、Agent 消息、系统消息）
 * - 支持 Markdown 渲染
 * - 支持流式输出动画
 * - 自动滚动到最新消息
 * - 显示时间戳
 * - 显示发送者头像和名称
 *
 * 参考：claude_manager 的 AgentChatMessageList 设计
 */

import React, { useRef, useEffect } from 'react';
import { Bot, User, Info } from 'lucide-react';
import type { Message } from './types';

/**
 * MessageList 组件 Props
 *
 * @property messages - 消息列表
 * @property isStreaming - 是否正在流式输出
 * @property className - 自定义样式类名（可选）
 */
export interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  className?: string;
}

/**
 * MessageBubble 单条消息组件
 *
 * @property message - 消息数据
 */
interface MessageBubbleProps {
  message: Message;
}

/**
 * 格式化时间戳为可读格式
 *
 * @param date - 时间戳
 * @returns 格式化后的时间字符串
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // 小于 1 分钟：显示"刚刚"
  if (seconds < 60) {
    return 'Just now';
  }

  // 小于 1 小时：显示"X 分钟前"
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  // 小于 24 小时：显示"X 小时前"
  if (hours < 24) {
    return `${hours}h ago`;
  }

  // 小于 7 天：显示"X 天前"
  if (days < 7) {
    return `${days}d ago`;
  }

  // 超过 7 天：显示完整日期
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * 根据发送者类型返回默认头像
 *
 * @param sender - 发送者类型
 * @returns 头像组件
 */
function getDefaultAvatar(sender: Message['sender']) {
  switch (sender) {
    case 'user':
      return <User size={16} className="text-white/70" />;
    case 'agent':
      return <Bot size={16} className="text-blue-400" />;
    case 'system':
      return <Info size={16} className="text-white/50" />;
    default:
      return <User size={16} className="text-white/70" />;
  }
}

/**
 * 单条消息气泡组件
 *
 * 布局：
 * - 用户消息：右对齐，蓝色背景
 * - Agent 消息：左对齐，深色背景
 * - 系统消息：居中，灰色背景
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isAgent = message.sender === 'agent';

  // 系统消息样式（居中显示）
  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs">
          <Info size={12} />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  // 用户消息或 Agent 消息
  return (
    <div
      className={`flex gap-3 px-4 py-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* 发送者头像 */}
      <div className="flex-shrink-0">
        {message.senderAvatar ? (
          <img
            src={message.senderAvatar}
            alt={message.senderName}
            className="w-8 h-8 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            {getDefaultAvatar(message.sender)}
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* 发送者名称和时间戳 */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="font-medium">{message.senderName}</span>
          <span>·</span>
          <span>{formatTimestamp(message.timestamp)}</span>
        </div>

        {/* 消息气泡 */}
        <div
          className={`
            px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${
              isUser
                ? 'bg-blue-500/20 text-white/90 rounded-tr-sm'
                : 'bg-white/5 text-white/90 rounded-tl-sm'
            }
            ${message.isStreaming ? 'animate-pulse' : ''}
          `}
        >
          {/* TODO: 这里应该使用 Markdown 渲染器，暂时使用纯文本 */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* 流式输出指示器 */}
          {message.isStreaming && (
            <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
              <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MessageList 组件
 *
 * 特性：
 * - 自动滚动到最新消息
 * - 虚拟滚动（TODO: 当消息数量很大时）
 * - 流式输出动画
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming = false,
  className = '',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isStreaming]);

  // 空状态
  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center text-white/40">
          <Bot size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start a conversation with the agent</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto ${className}`}
      style={{
        // 自定义滚动条样式
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
      }}
    >
      {/* 消息列表 */}
      <div className="flex flex-col">
        {messages.map((message) => (
          <MessageBubble key={message.messageId} message={message} />
        ))}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(MessageList);
