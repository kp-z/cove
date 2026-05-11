/**
 * ThreadTabs 组件
 *
 * 显示 Channel 内的 Thread 列表，支持切换和管理
 * 位于 ChannelHeader 下方
 *
 * 功能：
 * - 显示 "All" Tab（显示 Channel 级别的所有消息）
 * - 显示 Thread 列表（可滚动）
 * - 支持切换 Thread
 * - 支持创建新 Thread
 * - 显示未读消息数量徽章
 *
 * 参考：claude_manager 的 AgentSessionTabs 设计
 */

import React, { useRef, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import type { Thread } from './types';

/**
 * ThreadTabs 组件 Props
 *
 * @property threads - Thread 列表
 * @property activeThreadId - 当前激活的 Thread ID（null 表示 "All" Tab）
 * @property onThreadChange - Thread 切换回调
 * @property onCreateThread - 创建新 Thread 回调
 */
export interface ThreadTabsProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadChange: (threadId: string | null) => void;
  onCreateThread: () => void;
}

/**
 * ThreadTab 单个标签组件
 *
 * @property thread - Thread 数据（null 表示 "All" Tab）
 * @property isActive - 是否为当前激活的 Tab
 * @property onClick - 点击回调
 */
interface ThreadTabProps {
  thread: Thread | null;
  isActive: boolean;
  onClick: () => void;
}

/**
 * 单个 Thread Tab 组件
 *
 * 显示 Thread 标题和未读消息数量
 */
const ThreadTab: React.FC<ThreadTabProps> = ({ thread, isActive, onClick }) => {
  const tabRef = useRef<HTMLButtonElement>(null);

  // 当 Tab 激活时，滚动到可见区域
  useEffect(() => {
    if (isActive && tabRef.current) {
      tabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [isActive]);

  // "All" Tab 的特殊样式
  if (!thread) {
    return (
      <button
        ref={tabRef}
        type="button"
        onClick={onClick}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap
          border-b-2 transition-colors shrink-0
          ${
            isActive
              ? 'border-blue-500 text-white bg-white/5'
              : 'border-transparent text-white/60 hover:text-white/80 hover:bg-white/5'
          }
        `}
        aria-label="All messages"
        title="显示所有消息"
      >
        <MessageSquare size={14} />
        <span>All</span>
      </button>
    );
  }

  // 普通 Thread Tab
  return (
    <button
      ref={tabRef}
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap
        border-b-2 transition-colors shrink-0 max-w-[200px]
        ${
          isActive
            ? 'border-blue-500 text-white bg-white/5'
            : 'border-transparent text-white/60 hover:text-white/80 hover:bg-white/5'
        }
      `}
      aria-label={`Thread: ${thread.title}`}
      title={thread.title}
    >
      {/* Thread 标题（截断） */}
      <span className="truncate">{thread.title}</span>

      {/* 未读消息徽章 */}
      {thread.unreadCount > 0 && (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-semibold">
          {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
        </span>
      )}
    </button>
  );
};

/**
 * ThreadTabs 组件
 *
 * 布局结构：
 * ┌─────────────────────────────────────┐
 * │ [All] [Thread1] [Thread2] ... [+]  │
 * └─────────────────────────────────────┘
 *
 * 特性：
 * - 水平滚动（当 Thread 数量过多时）
 * - 自动滚动到激活的 Tab
 * - 创建新 Thread 按钮固定在右侧
 */
export const ThreadTabs: React.FC<ThreadTabsProps> = ({
  threads,
  activeThreadId,
  onThreadChange,
  onCreateThread,
}) => {
  return (
    <div className="flex items-center border-b border-white/10 bg-[#0f111a]">
      {/* Thread 列表容器（可滚动） */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide min-w-0">
        {/* "All" Tab - 显示所有消息 */}
        <ThreadTab
          thread={null}
          isActive={activeThreadId === null}
          onClick={() => onThreadChange(null)}
        />

        {/* Thread 列表 */}
        {threads.map((thread) => (
          <ThreadTab
            key={thread.threadId}
            thread={thread}
            isActive={activeThreadId === thread.threadId}
            onClick={() => onThreadChange(thread.threadId)}
          />
        ))}
      </div>

      {/* 创建新 Thread 按钮（固定在右侧） */}
      <button
        type="button"
        onClick={onCreateThread}
        className="flex items-center justify-center w-10 h-10 border-l border-white/10 hover:bg-white/5 active:bg-white/10 transition-colors shrink-0"
        aria-label="Create new thread"
        title="创建新 Thread"
      >
        <Plus size={16} className="text-white/70" />
      </button>
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(ThreadTabs);
