/**
 * MessageList 组件
 *
 * 显示消息列表，支持：
 * - 用户消息、Agent 消息、系统消息三种类型
 * - 自动滚动到底部
 * - 日期分隔
 * - 消息分组（同一发送者连续消息）
 * - 流式输出动画
 */

import React, { useEffect, useRef } from 'react';
import type { Message } from './types';

// ============================================================================
// Props 定义
// ============================================================================

interface MessageListProps {
  /** 消息列表 */
  messages: Message[];

  /** 是否正在加载 */
  isLoading?: boolean;

  /** 自定义样式类名 */
  className?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化时间戳
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 1分钟内：刚刚
  if (diff < 60000) {
    return '刚刚';
  }

  // 1小时内：X分钟前
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  }

  // 今天：HH:mm
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  // 昨天：昨天 HH:mm
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // 其他：MM-DD HH:mm
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
         date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 检查是否需要显示日期分隔
 */
function shouldShowDateSeparator(currentMsg: Message, prevMsg?: Message): boolean {
  if (!prevMsg) return true;

  const currentDate = new Date(currentMsg.timestamp).toDateString();
  const prevDate = new Date(prevMsg.timestamp).toDateString();

  return currentDate !== prevDate;
}

/**
 * 检查是否应该分组（同一发送者连续消息）
 */
function shouldGroupMessage(currentMsg: Message, prevMsg?: Message): boolean {
  if (!prevMsg) return false;

  // 不同发送者：不分组
  if (currentMsg.sender !== prevMsg.sender || currentMsg.senderName !== prevMsg.senderName) {
    return false;
  }

  // 时间间隔超过5分钟：不分组
  const timeDiff = new Date(currentMsg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime();
  if (timeDiff > 300000) {
    return false;
  }

  return true;
}

// ============================================================================
// 子组件
// ============================================================================

/**
 * 日期分隔组件
 * 对齐 claude_manager 的样式
 */
function DateSeparator({ date }: { date: Date }) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  let label = '';
  if (isToday) {
    label = '今天';
  } else if (isYesterday) {
    label = '昨天';
  } else {
    label = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex-1 h-px bg-white/5" />
      <span className="px-3 text-xs text-gray-600">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

/**
 * 消息气泡组件
 * 对齐 claude_manager 的样式
 */
function MessageBubble({ message, isGrouped }: { message: Message; isGrouped: boolean }) {
  const isUser = message.sender === 'user';
  const isAgent = message.sender === 'agent';
  const isSystem = message.sender === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-3'}`}>
      <div className={`relative group ${isUser ? 'max-w-[95%]' : 'max-w-[95%]'}`}>
        {/* 发送者名称和时间（非分组消息） */}
        {!isGrouped && !isUser && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className={`text-xs font-medium ${
              isAgent ? 'text-purple-400' : 'text-gray-400'
            }`}>
              {message.senderName}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        )}

        {/* 消息气泡 */}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm overflow-hidden break-words ${
            isSystem
              ? 'bg-black/50 border border-white/10 text-gray-400 text-sm italic'
              : isUser
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : 'bg-black/70 border border-purple-500/40 text-gray-100'
          }`}
        >
          {/* 流式输出动画 */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
          )}

          {/* 消息内容（支持 Markdown） */}
          <div className="prose prose-sm prose-invert max-w-none text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {/* 用户消息的时间戳（右下角） */}
        {isUser && !isGrouped && (
          <div className="text-xs text-gray-500 mt-1 px-1 text-right">
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function MessageList({ messages, isLoading, className = '' }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto px-4 py-4 bg-[#1a1d2e] space-y-0 ${className}`}
    >
      {/* 加载状态 */}
      {isLoading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-sm">加载中...</div>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">暂无消息</p>
          <p className="text-xs mt-1 text-gray-600">发送第一条消息开始对话</p>
        </div>
      )}

      {/* 消息列表 */}
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : undefined;
        const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
        const isGrouped = shouldGroupMessage(message, prevMessage);

        return (
          <React.Fragment key={message.messageId}>
            {/* 日期分隔 */}
            {showDateSeparator && <DateSeparator date={message.timestamp} />}

            {/* 消息气泡 */}
            <MessageBubble message={message} isGrouped={isGrouped} />
          </React.Fragment>
        );
      })}

      {/* 滚动锚点 */}
      <div ref={messagesEndRef} />
    </div>
  );
}
