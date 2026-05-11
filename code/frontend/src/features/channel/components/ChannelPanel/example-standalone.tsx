/**
 * ChannelPanel 独立示例（无需后端）
 *
 * 使用 Mock 数据，可以直接在前端查看 UI 效果
 * 不依赖后端 API 和 WebSocket
 */

import React, { useState, useCallback } from 'react';
import { ChannelTabs } from './ChannelTabs';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Channel, Thread, Message } from './types';

// ============================================================================
// Mock 数据
// ============================================================================

const mockChannel: Channel = {
  channelId: 'channel-1',
  type: 'team',
  name: 'General',
  description: '团队通用频道',
  unreadCount: 0,
  lastActivity: new Date(),
  isPinned: false,
  metadata: {
    projectId: 'project-1',
  },
};

const mockThreads: Thread[] = [
  {
    threadId: 'thread-1',
    channelId: 'channel-1',
    title: '功能讨论',
    isPinned: true,
    lastActivity: new Date(Date.now() - 3600000),
    messageCount: 15,
    unreadCount: 2,
    status: 'active',
  },
  {
    threadId: 'thread-2',
    channelId: 'channel-1',
    title: 'Bug 修复',
    isPinned: false,
    lastActivity: new Date(Date.now() - 7200000),
    messageCount: 8,
    unreadCount: 0,
    status: 'active',
  },
];

const mockMessages: Message[] = [
  {
    messageId: 'msg-1',
    threadId: '',
    sender: 'user',
    senderName: 'Alice',
    content: '大家好，我们开始讨论新功能吧',
    timestamp: new Date(Date.now() - 3600000),
    isStreaming: false,
  },
  {
    messageId: 'msg-2',
    threadId: '',
    sender: 'agent',
    senderName: 'CodeAssistant',
    content: '好的，我已经准备好了。请问需要讨论哪些方面？',
    timestamp: new Date(Date.now() - 3500000),
    isStreaming: false,
  },
  {
    messageId: 'msg-3',
    threadId: '',
    sender: 'user',
    senderName: 'Bob',
    content: '我觉得我们应该先确定技术栈',
    timestamp: new Date(Date.now() - 3400000),
    isStreaming: false,
  },
  {
    messageId: 'msg-4',
    threadId: '',
    sender: 'system',
    senderName: 'System',
    content: 'Alice 创建了新的 Thread: 功能讨论',
    timestamp: new Date(Date.now() - 3300000),
    isStreaming: false,
  },
];

// ============================================================================
// 独立组件
// ============================================================================

export function StandaloneChannelPanel() {
  // --------------------------------------------------------------------------
  // 状态管理
  // --------------------------------------------------------------------------

  const [channel] = useState<Channel>(mockChannel);
  const [threads, setThreads] = useState<Thread[]>(mockThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [isGenerating, setIsGenerating] = useState(false);

  // --------------------------------------------------------------------------
  // 消息发送（Mock）
  // --------------------------------------------------------------------------

  const handleSendMessage = useCallback(async (content: string) => {
    // 模拟用户消息
    const userMessage: Message = {
      messageId: `msg-${Date.now()}`,
      threadId: activeThreadId || '',
      sender: 'user',
      senderName: 'You',
      content,
      timestamp: new Date(),
      isStreaming: false,
    };

    setMessages((prev) => [...prev, userMessage]);

    // 模拟 Agent 响应
    setIsGenerating(true);

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const agentMessage: Message = {
      messageId: `msg-${Date.now() + 1}`,
      threadId: activeThreadId || '',
      sender: 'agent',
      senderName: 'CodeAssistant',
      content: `收到你的消息："${content}"。这是一个 Mock 响应，实际响应需要连接后端服务器。`,
      timestamp: new Date(),
      isStreaming: false,
    };

    setMessages((prev) => [...prev, agentMessage]);
    setIsGenerating(false);
  }, [activeThreadId]);

  const handleStopGeneration = useCallback(() => {
    setIsGenerating(false);
  }, []);

  // --------------------------------------------------------------------------
  // Thread 管理（Mock）
  // --------------------------------------------------------------------------

  const handleThreadChange = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);

    // 根据 threadId 过滤消息
    if (threadId) {
      // 模拟加载 Thread 消息
      const threadMessages: Message[] = [
        {
          messageId: `thread-msg-1`,
          threadId,
          sender: 'user',
          senderName: 'Alice',
          content: '这是 Thread 中的第一条消息',
          timestamp: new Date(Date.now() - 1800000),
          isStreaming: false,
        },
        {
          messageId: `thread-msg-2`,
          threadId,
          sender: 'agent',
          senderName: 'CodeAssistant',
          content: '我明白了，让我们继续讨论',
          timestamp: new Date(Date.now() - 1700000),
          isStreaming: false,
        },
      ];
      setMessages(threadMessages);
    } else {
      // 返回 Channel 级别消息
      setMessages(mockMessages);
    }
  }, []);

  const handleNewThread = useCallback(() => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread: Thread = {
      threadId: newThreadId,
      channelId: channel.channelId,
      title: '新对话',
      isPinned: false,
      lastActivity: new Date(),
      messageCount: 0,
      unreadCount: 0,
      status: 'active',
    };

    setThreads((prev) => [...prev, newThread]);
    setActiveThreadId(newThreadId);
    setMessages([]);
  }, [channel.channelId]);

  const handleCloseThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.threadId !== threadId));

    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setMessages(mockMessages);
    }
  }, [activeThreadId]);

  // --------------------------------------------------------------------------
  // 渲染
  // --------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {channel.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mock 模式 - 无需后端
          </p>
        </div>

        <button
          onClick={() => console.log('Close clicked')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Channel Tabs */}
      <ChannelTabs
        channel={channel}
        threads={threads}
        activeThreadId={activeThreadId}
        onThreadChange={handleThreadChange}
        onNewThread={handleNewThread}
        onCloseThread={handleCloseThread}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        isLoading={false}
      />

      {/* Composer */}
      <Composer
        threadId={activeThreadId || channel.channelId}
        isGenerating={isGenerating}
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
      />
    </div>
  );
}

// ============================================================================
// 完整页面示例
// ============================================================================

export default function StandaloneExample() {
  return (
    <div className="w-full h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto h-full py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full overflow-hidden">
          <StandaloneChannelPanel />
        </div>
      </div>
    </div>
  );
}
