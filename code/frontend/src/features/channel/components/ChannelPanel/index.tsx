/**
 * ChannelPanel 主组件
 *
 * Agent Channel 对话面板，整合所有子组件
 *
 * 功能：
 * - Channel 和 Thread 管理
 * - 消息列表显示
 * - 消息发送和接收
 * - WebSocket 实时更新
 * - Agent 响应处理
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChannelTabs } from './ChannelTabs';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Channel, Thread, Message, ChannelPanelProps } from './types';
import { apiClient } from '../../api/client';
import type { SendMessageDTO, MessageEntity } from '../../api/client';
import { AgentChannelWebSocketClient } from '../../api/websocket';
import type { BroadcastMessage } from '../../api/websocket';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 将后端 MessageEntity 转换为前端 Message
 */
function messageEntityToMessage(entity: MessageEntity): Message {
  return {
    messageId: entity.id,
    threadId: entity.threadId || '',
    sender: entity.senderType === 'human' ? 'user' : entity.senderType === 'agent' ? 'agent' : 'system',
    senderName: entity.senderId, // TODO: 从用户/Agent 信息中获取真实名称
    content: entity.content,
    timestamp: new Date(entity.createdAt),
    isStreaming: false,
  };
}

// ============================================================================
// 主组件
// ============================================================================

export function ChannelPanel({
  channelId,
  threadId: initialThreadId,
  onClose,
  className = '',
}: ChannelPanelProps) {
  // --------------------------------------------------------------------------
  // 状态管理
  // --------------------------------------------------------------------------

  const [channel, setChannel] = useState<Channel | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [wsClient, setWsClient] = useState<AgentChannelWebSocketClient | null>(null);

  // --------------------------------------------------------------------------
  // 初始化
  // --------------------------------------------------------------------------

  /**
   * 加载 Channel 信息
   */
  const loadChannel = useCallback(async () => {
    try {
      const channelData = await apiClient.getChannel(channelId);

      // 转换为前端 Channel 格式
      const channel: Channel = {
        channelId: channelData.id,
        type: channelData.type === 'dm' ? 'dm' : channelData.type === 'private' ? 'private' : 'public',
        name: channelData.name,
        description: channelData.description,
        unreadCount: 0,
        lastActivity: new Date(channelData.updatedAt),
        isPinned: false,
        metadata: {
          projectId: channelData.projectId,
        },
      };

      setChannel(channel);
    } catch (error) {
      console.error('Failed to load channel:', error);

      // 使用 Mock 数据作为后备
      const mockChannel: Channel = {
        channelId,
        type: 'public',
        name: 'Demo Channel',
        description: 'This is a demo channel with mock data',
        unreadCount: 0,
        lastActivity: new Date(),
        isPinned: false,
        metadata: {},
      };
      setChannel(mockChannel);
    }
  }, [channelId]);

  /**
   * 加载消息列表
   */
  const loadMessages = useCallback(async () => {
    if (!activeThreadId && !channelId) return;

    setIsLoading(true);

    try {
      const { messages: messageEntities } = await apiClient.getMessages(channelId, {
        limit: 100,
      });

      // 过滤当前 Thread 的消息
      const filteredMessages = activeThreadId
        ? messageEntities.filter((m) => m.threadId === activeThreadId)
        : messageEntities.filter((m) => !m.threadId);

      // 转换为前端 Message 格式
      const messages = filteredMessages.map(messageEntityToMessage);

      setMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);

      // 使用 Mock 数据作为后备
      const mockMessages: Message[] = [
        {
          messageId: 'msg-1',
          threadId: activeThreadId || '',
          sender: 'user',
          senderName: 'Alice',
          content: '你好，这是一个演示消息',
          timestamp: new Date(Date.now() - 3600000),
          isStreaming: false,
        },
        {
          messageId: 'msg-2',
          threadId: activeThreadId || '',
          sender: 'agent',
          senderName: 'AI Assistant',
          content: '你好！我是 AI 助手。这是一个使用 Mock 数据的演示界面。\n\n你可以：\n- 查看消息列表\n- 发送新消息（仅前端演示）\n- 切换不同的 Thread',
          timestamp: new Date(Date.now() - 3500000),
          isStreaming: false,
        },
        {
          messageId: 'msg-3',
          threadId: activeThreadId || '',
          sender: 'user',
          senderName: 'Bob',
          content: '这个界面看起来不错！',
          timestamp: new Date(Date.now() - 3400000),
          isStreaming: false,
        },
      ];
      setMessages(mockMessages);

      // 添加一些 Mock Threads
      const mockThreads: Thread[] = [
        {
          threadId: 'thread-1',
          channelId,
          title: '功能讨论',
          isPinned: true,
          lastActivity: new Date(Date.now() - 3600000),
          messageCount: 15,
          unreadCount: 2,
          status: 'active',
        },
        {
          threadId: 'thread-2',
          channelId,
          title: 'Bug 修复',
          isPinned: false,
          lastActivity: new Date(Date.now() - 7200000),
          messageCount: 8,
          unreadCount: 0,
          status: 'active',
        },
      ];
      setThreads(mockThreads);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, activeThreadId]);

  /**
   * 初始化 WebSocket 连接
   */
  useEffect(() => {
    // TODO: 从用户上下文获取真实的 userId
    const userId = 'current-user-id';
    const wsUrl = 'ws://localhost:3000/ws'; // TODO: 从配置获取

    const client = new AgentChannelWebSocketClient(wsUrl, userId, 'human');

    // 连接到 WebSocket
    client.connect().then(() => {
      console.log('WebSocket connected');

      // 订阅当前频道
      client.subscribe(channelId);

      // 监听新消息
      client.on(channelId, handleWebSocketMessage);
    }).catch((error) => {
      console.error('WebSocket connection failed:', error);
    });

    setWsClient(client);

    // 清理
    return () => {
      client.disconnect();
    };
  }, [channelId]);

  /**
   * 加载初始数据
   */
  useEffect(() => {
    loadChannel();
    loadMessages();
  }, [loadChannel, loadMessages]);

  // --------------------------------------------------------------------------
  // WebSocket 消息处理
  // --------------------------------------------------------------------------

  /**
   * 处理 WebSocket 推送的消息
   */
  const handleWebSocketMessage = useCallback((broadcast: BroadcastMessage) => {
    console.log('WebSocket message received:', broadcast);

    if (broadcast.type === 'message' && broadcast.data) {
      // 新消息推送
      const messageEntity: MessageEntity = broadcast.data;

      // 检查是否属于当前 Thread
      const belongsToCurrentThread = activeThreadId
        ? messageEntity.threadId === activeThreadId
        : !messageEntity.threadId;

      if (belongsToCurrentThread) {
        const newMessage = messageEntityToMessage(messageEntity);
        setMessages((prev) => [...prev, newMessage]);
      }
    }
  }, [activeThreadId]);

  // --------------------------------------------------------------------------
  // 消息发送
  // --------------------------------------------------------------------------

  /**
   * 发送消息
   */
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      setIsGenerating(true);

      // TODO: 从用户上下文获取真实的 userId
      const userId = 'current-user-id';

      const dto: SendMessageDTO = {
        channelId,
        senderId: userId,
        senderType: 'human',
        content,
        threadId: activeThreadId || undefined,
      };

      // 发送消息到后端
      const messageEntity = await apiClient.sendMessage(dto);

      // 添加到消息列表（如果 WebSocket 没有推送）
      const newMessage = messageEntityToMessage(messageEntity);
      setMessages((prev) => {
        // 检查是否已存在（避免重复）
        if (prev.some((m) => m.messageId === newMessage.messageId)) {
          return prev;
        }
        return [...prev, newMessage];
      });

      // Agent 会自动响应，通过 WebSocket 推送
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [channelId, activeThreadId]);

  /**
   * 停止生成
   */
  const handleStopGeneration = useCallback(() => {
    // TODO: 调用后端 API 停止 Agent 生成
    setIsGenerating(false);
  }, []);

  // --------------------------------------------------------------------------
  // Thread 管理
  // --------------------------------------------------------------------------

  /**
   * 切换 Thread
   */
  const handleThreadChange = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
  }, []);

  /**
   * 新建 Thread
   */
  const handleNewThread = useCallback(() => {
    // TODO: 调用后端 API 创建新 Thread
    const newThreadId = `thread-${Date.now()}`;
    const newThread: Thread = {
      threadId: newThreadId,
      channelId,
      title: '新对话',
      isPinned: false,
      lastActivity: new Date(),
      messageCount: 0,
      unreadCount: 0,
      status: 'active',
    };

    setThreads((prev) => [...prev, newThread]);
    setActiveThreadId(newThreadId);
  }, [channelId]);

  /**
   * 关闭 Thread
   */
  const handleCloseThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.threadId !== threadId));

    // 如果关闭的是当前 Thread，切换到 Channel 级别
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
  }, [activeThreadId]);

  // --------------------------------------------------------------------------
  // 渲染
  // --------------------------------------------------------------------------

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[#1a1d2e] ${className}`}>
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
        isLoading={isLoading}
      />

      {/* Composer */}
      <Composer
        threadId={activeThreadId || channelId}
        isGenerating={isGenerating}
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
      />
    </div>
  );
}

// 重新导出类型，方便其他文件导入
export type { Channel, Thread, Message, ChannelPanelProps, ChannelType, MessageSender, AgentInfo } from './types';
