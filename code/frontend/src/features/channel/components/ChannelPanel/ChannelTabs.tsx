/**
 * ChannelTabs 组件
 *
 * Channel Tab 固定 + Thread Tabs 可滚动的标签栏
 * 完全对齐 claude_manager 的 AgentSessionTabs 样式
 *
 * 功能：
 * - Channel Tab 固定在左侧
 * - Thread Tabs 可滚动
 * - 支持新建 Thread
 * - 支持关闭 Thread
 * - 支持右键菜单（重命名、置顶、关闭）
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Hash, Lock, Plus, X, Loader2 } from 'lucide-react';
import type { Channel, Thread } from './types';

// ============================================================================
// Props 定义
// ============================================================================

interface ChannelTabsProps {
  /** 当前 Channel */
  channel: Channel;

  /** Thread 列表 */
  threads: Thread[];

  /** 当前激活的 Thread ID（null 表示 Channel 级别） */
  activeThreadId: string | null;

  /** 切换 Thread 回调 */
  onThreadChange: (threadId: string | null) => void;

  /** 新建 Thread 回调 */
  onNewThread: () => void;

  /** 关闭 Thread 回调 */
  onCloseThread: (threadId: string) => void;

  /** 重命名 Thread 回调 */
  onRenameThread?: (threadId: string, newTitle: string) => void;

  /** 置顶 Thread 回调 */
  onPinThread?: (threadId: string) => void;

  /** 自定义样式类名 */
  className?: string;
}

// ============================================================================
// 子组件
// ============================================================================

/**
 * Channel Tab（固定）
 * 对齐 claude_manager 的 AgentSessionTabs 样式
 */
function ChannelTab({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  // 根据 channel 类型选择图标
  const getChannelIcon = () => {
    switch (channel.type) {
      case 'public':
        return Hash;
      case 'private':
        return Lock;
      case 'dm':
      case 'thread':
        return MessageSquare;
      default:
        return Hash;
    }
  };
  const Icon = getChannelIcon();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-left text-xs rounded-t transition-colors min-w-0 max-w-[220px] border-b-2 ${
        isActive
          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
          : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="flex items-center gap-1 truncate whitespace-nowrap font-medium text-[11px] leading-tight min-w-0">
        <Icon className="w-3 h-3 shrink-0 opacity-80" aria-label="Channel" />
        <span className="truncate">{channel.name}</span>
        {channel.unreadCount > 0 && (
          <span className="ml-0.5 px-1 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Thread Tab
 * 对齐 claude_manager 的 AgentSessionTabs 样式
 */
function ThreadTab({
  thread,
  isActive,
  onClick,
  onClose,
}: {
  thread: Thread;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  const isPinned = thread.isPinned || false;

  return (
    <div className="relative group flex-shrink-0 flex items-stretch rounded-t">
      <button
        type="button"
        onClick={onClick}
        className={`px-2 py-1 pr-6 text-left text-xs rounded-t transition-colors min-w-0 max-w-[220px] border-b-2 ${
          isActive
            ? isPinned
              ? 'bg-amber-500/20 text-amber-300 border-amber-400'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
            : isPinned
              ? 'text-amber-300/90 border-amber-500/60 hover:text-amber-200 hover:bg-amber-500/10'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="flex items-center gap-1 truncate whitespace-nowrap font-medium text-[11px] leading-tight min-w-0">
          <MessageSquare className="w-3 h-3 shrink-0 opacity-80" aria-label="Thread" />
          <span className="truncate">{thread.title}</span>
          {thread.unreadCount > 0 && (
            <span className="ml-0.5 px-1 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
            </span>
          )}
        </span>
      </button>

      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
        title="关闭"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * 新建 Thread 按钮
 * 对齐 claude_manager 的样式
 */
function NewThreadButton({ onClick, creating }: { onClick: () => void; creating?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      className={`px-2 py-1 rounded-t transition-colors shrink-0 ${
        creating
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      title="新建 Thread"
    >
      {creating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Plus className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function ChannelTabs({
  channel,
  threads,
  activeThreadId,
  onThreadChange,
  onNewThread,
  onCloseThread,
  onRenameThread,
  onPinThread,
  className = '',
}: ChannelTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // --------------------------------------------------------------------------
  // 滚动控制
  // --------------------------------------------------------------------------

  /**
   * 检查是否需要显示滚动按钮
   */
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [threads]);

  /**
   * 滚动到指定方向
   */
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 200;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  // --------------------------------------------------------------------------
  // 渲染
  // --------------------------------------------------------------------------

  // 排序 Threads：置顶的在前，然后按最后活动时间排序
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  return (
    <div className={`relative border-b border-white/10 ${className}`}>
      <div className="flex items-stretch gap-2 px-2 py-1">
        {/* 新建 Thread 按钮 */}
        <div className="shrink-0 flex items-center gap-1">
          <NewThreadButton onClick={onNewThread} />
        </div>

        {/* Channel Tab + Thread Tabs（可滚动） */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* Channel Tab（固定） */}
          <ChannelTab
            channel={channel}
            isActive={activeThreadId === null}
            onClick={() => onThreadChange(null)}
          />

          {/* Thread Tabs */}
          {sortedThreads.map((thread) => (
            <ThreadTab
              key={thread.threadId}
              thread={thread}
              isActive={activeThreadId === thread.threadId}
              onClick={() => onThreadChange(thread.threadId)}
              onClose={() => onCloseThread(thread.threadId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
