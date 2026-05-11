/**
 * ChannelPanel 主组件
 *
 * 统一的 Agent Channel 对话面板
 * 集成所有子组件，提供完整的对话功能
 *
 * 组件结构（从上到下）：
 * 1. ChannelHeader - Channel 信息和操作按钮
 * 2. ThreadTabs - Thread 切换标签栏
 * 3. AgentInfoBar - Agent 信息展示
 * 4. MessageList - 消息列表（占据主要空间）
 * 5. Composer - 输入框和发送按钮
 *
 * 参考：claude_manager 的 AgentChatSidebar 和 GlobalAgentChatPanel 设计
 */

import React, { useState, useCallback, useMemo } from 'react';
import ChannelHeader from './ChannelHeader';
import ThreadTabs from './ThreadTabs';
import AgentInfoBar from './AgentInfoBar';
import MessageList from './MessageList';
import Composer from './Composer';
import type { ChannelPanelProps, Channel, Thread, Message, AgentInfo } from './types';

/**
 * ChannelPanel 主组件
 *
 * 这是一个纯前端组件，使用 Mock 数据演示功能
 * 实际使用时需要：
 * 1. 通过 API 获取 Channel、Thread、Message 数据
 * 2. 通过 WebSocket 接收实时消息
 * 3. 集成状态管理（Zustand）
 * 4. 集成 React Query 进行数据缓存
 */
export const ChannelPanel: React.FC<ChannelPanelProps> = ({
  channelId,
  threadId: initialThreadId,
  onClose,
  className = '',
}) => {
  // ========================================
  // 状态管理（实际使用时应该从 Zustand Store 获取）
  // ========================================

  // 当前激活的 Thread ID（null 表示 "All" Tab）
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId || null
  );

  // Agent 信息展开状态
  const [agentExpanded, setAgentExpanded] = useState(false);

  // 输入框的值
  const [inputValue, setInputValue] = useState('');

  // 是否正在流式输出
  const [isStreaming, setIsStreaming] = useState(false);

  // ========================================
  // Mock 数据（实际使用时应该从 API 获取）
  // ========================================

  // Mock Channel 数据
  const channel: Channel = useMemo(
    () => ({
      channelId,
      type: 'agent',
      name: '@code-reviewer',
      description: 'AI code reviewer agent for pull request reviews',
      unreadCount: 3,
      lastActivity: new Date(),
      isPinned: true,
      metadata: {
        agentId: 'agent-123',
      },
    }),
    [channelId]
  );

  // Mock Thread 列表
  const threads: Thread[] = useMemo(
    () => [
      {
        threadId: 'thread-1',
        channelId,
        title: 'Bug fix discussion',
        isPinned: true,
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        messageCount: 15,
        unreadCount: 2,
      },
      {
        threadId: 'thread-2',
        channelId,
        title: 'Feature development plan',
        isPinned: false,
        lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        messageCount: 8,
        unreadCount: 0,
      },
      {
        threadId: 'thread-3',
        channelId,
        title: 'Performance optimization',
        isPinned: false,
        lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        messageCount: 23,
        unreadCount: 1,
      },
    ],
    [channelId]
  );

  // Mock Agent 信息
  const agent: AgentInfo = useMemo(
    () => ({
      agentId: 'agent-123',
      name: 'Code Reviewer',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=code-reviewer',
      model: 'sonnet',
      status: isStreaming ? 'running' : 'idle',
      description:
        'I help review code, suggest improvements, and ensure best practices are followed.',
    }),
    [isStreaming]
  );

  // Mock 消息列表
  const messages: Message[] = useMemo(() => {
    // 根据当前激活的 Thread 返回不同的消息
    const baseMessages: Message[] = [
      {
        messageId: 'msg-1',
        threadId: activeThreadId || 'all',
        sender: 'user',
        senderName: 'You',
        content: 'Can you review this pull request for me?',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      },
      {
        messageId: 'msg-2',
        threadId: activeThreadId || 'all',
        sender: 'agent',
        senderName: agent.name,
        senderAvatar: agent.avatar,
        content:
          "Of course! I'd be happy to review your pull request. Please share the PR link or the code changes you'd like me to review.",
        timestamp: new Date(Date.now() - 9 * 60 * 1000), // 9 minutes ago
      },
      {
        messageId: 'msg-3',
        threadId: activeThreadId || 'all',
        sender: 'user',
        senderName: 'You',
        content: 'Here is the code:\n\n```typescript\nfunction calculateTotal(items: Item[]) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}\n```',
        timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
      },
      {
        messageId: 'msg-4',
        threadId: activeThreadId || 'all',
        sender: 'agent',
        senderName: agent.name,
        senderAvatar: agent.avatar,
        content:
          "Great! I've reviewed your code. Here are my suggestions:\n\n1. **Type Safety**: Consider adding a return type annotation\n2. **Error Handling**: Add validation for empty arrays\n3. **Performance**: This implementation is efficient for small arrays\n\nWould you like me to provide a refactored version?",
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    ];

    // 如果正在流式输出，添加一条流式消息
    if (isStreaming) {
      baseMessages.push({
        messageId: 'msg-streaming',
        threadId: activeThreadId || 'all',
        sender: 'agent',
        senderName: agent.name,
        senderAvatar: agent.avatar,
        content: 'Let me provide a refactored version with improvements...',
        timestamp: new Date(),
        isStreaming: true,
      });
    }

    return baseMessages;
  }, [activeThreadId, agent, isStreaming]);

  // ========================================
  // 事件处理函数
  // ========================================

  // 返回 Channel Hub
  const handleBack = useCallback(() => {
    // TODO: 实际实现应该调用 agentChannelStore.closeChannel()
    console.log('Back to Channel Hub');
  }, []);

  // Thread 切换
  const handleThreadChange = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
    // TODO: 实际实现应该调用 API 加载该 Thread 的消息
    console.log('Switch to thread:', threadId);
  }, []);

  // 创建新 Thread
  const handleCreateThread = useCallback(() => {
    // TODO: 实际实现应该弹出对话框让用户输入 Thread 标题
    console.log('Create new thread');
  }, []);

  // 发送消息
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    // TODO: 实际实现应该调用 API 发送消息
    console.log('Send message:', inputValue);

    // 模拟流式输出
    setIsStreaming(true);
    setTimeout(() => {
      setIsStreaming(false);
      setInputValue('');
    }, 3000);
  }, [inputValue]);

  // 停止生成
  const handleStop = useCallback(() => {
    // TODO: 实际实现应该调用 API 取消流式输出
    console.log('Stop generating');
    setIsStreaming(false);
  }, []);

  // ========================================
  // 渲染
  // ========================================

  return (
    <div
      className={`flex flex-col h-full bg-[#0f111a] ${className}`}
      style={{
        // 确保组件占据整个高度
        minHeight: 0,
      }}
    >
      {/* 1. Channel Header - 顶部信息栏 */}
      <ChannelHeader channel={channel} onBack={handleBack} onClose={onClose} />

      {/* 2. Thread Tabs - Thread 切换标签栏 */}
      <ThreadTabs
        threads={threads}
        activeThreadId={activeThreadId}
        onThreadChange={handleThreadChange}
        onCreateThread={handleCreateThread}
      />

      {/* 3. Agent Info Bar - Agent 信息展示栏 */}
      <AgentInfoBar
        agent={agent}
        expanded={agentExpanded}
        onToggleExpand={() => setAgentExpanded(!agentExpanded)}
      />

      {/* 4. Message List - 消息列表（占据主要空间） */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* 5. Composer - 输入框和发送按钮 */}
      <Composer
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        placeholder="Type a message..."
        maxLength={10000}
      />
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(ChannelPanel);
