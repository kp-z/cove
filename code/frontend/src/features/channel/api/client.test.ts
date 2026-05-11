/**
 * Agent Channel API Client - 单元测试
 *
 * 测试范围：
 * - 消息相关 API（7 个端点）
 * - 频道相关 API（3 个端点）
 * - 错误处理（网络错误、4xx、5xx）
 * - 参数验证和响应解析
 *
 * 测试策略：
 * - Mock fetch API
 * - 验证请求参数（URL、method、headers、body）
 * - 验证响应解析和错误处理
 * - 覆盖成功和失败场景
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentChannelApiClient,
  type SendMessageDTO,
  type UpdateMessageDTO,
  type DeleteMessageDTO,
  type ReactionDTO,
  type MessageEntity,
  type ChannelEntity,
} from './client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock fetch globally
global.fetch = vi.fn();

// Helper: 创建成功响应
const mockSuccessResponse = <T>(data: T) => {
  return Promise.resolve({
    json: () => Promise.resolve({ success: true, data }),
  } as Response);
};

// Helper: 创建错误响应
const mockErrorResponse = (code: string, message: string) => {
  return Promise.resolve({
    json: () => Promise.resolve({ success: false, error: { code, message } }),
  } as Response);
};

// Helper: 创建网络错误
const mockNetworkError = () => {
  return Promise.reject(new Error('Network error'));
};

// ============================================================================
// Test Suite
// ============================================================================

describe('AgentChannelApiClient', () => {
  let client: AgentChannelApiClient;

  beforeEach(() => {
    // 每个测试前重置 client 和 mock
    client = new AgentChannelApiClient('/api');
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 构造函数测试
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('应该使用默认 baseUrl', () => {
      const defaultClient = new AgentChannelApiClient();
      expect(defaultClient['baseUrl']).toBe('/api');
    });

    it('应该使用自定义 baseUrl', () => {
      const customClient = new AgentChannelApiClient('https://api.example.com');
      expect(customClient['baseUrl']).toBe('https://api.example.com');
    });
  });

  // --------------------------------------------------------------------------
  // 消息相关 API 测试
  // --------------------------------------------------------------------------

  describe('sendMessage', () => {
    it('应该成功发送消息', async () => {
      // Arrange
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello, world!',
      };

      const mockMessage: MessageEntity = {
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello, world!',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMessage));

      // Act
      const result = await client.sendMessage(dto);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/channels/channel-1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: 'user-1',
          senderType: 'human',
          content: 'Hello, world!',
          threadId: undefined,
          attachments: undefined,
          mentions: undefined,
        }),
      });
      expect(result).toEqual(mockMessage);
    });

    it('应该发送带有 threadId 和 mentions 的消息', async () => {
      // Arrange
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@alice check this',
        threadId: 'thread-1',
        mentions: ['alice'],
      };

      const mockMessage: MessageEntity = {
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@alice check this',
        threadId: 'thread-1',
        mentions: ['alice'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMessage));

      // Act
      const result = await client.sendMessage(dto);

      // Assert
      expect(result.threadId).toBe('thread-1');
      expect(result.mentions).toEqual(['alice']);
    });

    it('应该在 API 返回错误时抛出异常', async () => {
      // Arrange
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
      };

      (global.fetch as any).mockReturnValue(
        mockErrorResponse('VALIDATION_ERROR', 'Content is required')
      );

      // Act & Assert
      await expect(client.sendMessage(dto)).rejects.toThrow('Content is required');
    });

    it('应该在网络错误时抛出异常', async () => {
      // Arrange
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
      };

      (global.fetch as any).mockReturnValue(mockNetworkError());

      // Act & Assert
      await expect(client.sendMessage(dto)).rejects.toThrow('Network error');
    });
  });

  describe('getMessages', () => {
    it('应该获取消息列表（无分页参数）', async () => {
      // Arrange
      const mockMessages: MessageEntity[] = [
        {
          id: 'msg-1',
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Message 1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          channelId: 'channel-1',
          senderId: 'agent-1',
          senderType: 'agent',
          content: 'Message 2',
          createdAt: '2024-01-01T00:01:00Z',
          updatedAt: '2024-01-01T00:01:00Z',
        },
      ];

      (global.fetch as any).mockReturnValue(
        mockSuccessResponse({ messages: mockMessages, total: 2 })
      );

      // Act
      const result = await client.getMessages('channel-1');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/channels/channel-1/messages');
      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('应该获取消息列表（带分页参数）', async () => {
      // Arrange
      const mockMessages: MessageEntity[] = [
        {
          id: 'msg-3',
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Message 3',
          createdAt: '2024-01-01T00:02:00Z',
          updatedAt: '2024-01-01T00:02:00Z',
        },
      ];

      (global.fetch as any).mockReturnValue(
        mockSuccessResponse({ messages: mockMessages, total: 10 })
      );

      // Act
      const result = await client.getMessages('channel-1', { limit: 10, offset: 20 });

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/channels/channel-1/messages?limit=10&offset=20'
      );
      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it('应该在 API 返回错误时抛出异常', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        mockErrorResponse('NOT_FOUND', 'Channel not found')
      );

      // Act & Assert
      await expect(client.getMessages('invalid-channel')).rejects.toThrow('Channel not found');
    });
  });

  describe('getMessage', () => {
    it('应该获取单条消息', async () => {
      // Arrange
      const mockMessage: MessageEntity = {
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMessage));

      // Act
      const result = await client.getMessage('msg-1');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/messages/msg-1');
      expect(result).toEqual(mockMessage);
    });

    it('应该在消息不存在时抛出异常', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        mockErrorResponse('NOT_FOUND', 'Message not found')
      );

      // Act & Assert
      await expect(client.getMessage('invalid-msg')).rejects.toThrow('Message not found');
    });
  });

  describe('updateMessage', () => {
    it('应该成功更新消息', async () => {
      // Arrange
      const dto: UpdateMessageDTO = {
        messageId: 'msg-1',
        content: 'Updated content',
      };

      const mockMessage: MessageEntity = {
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Updated content',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:05:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMessage));

      // Act
      const result = await client.updateMessage(dto);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/messages/msg-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated content' }),
      });
      expect(result.content).toBe('Updated content');
    });

    it('应该在更新失败时抛出异常', async () => {
      // Arrange
      const dto: UpdateMessageDTO = {
        messageId: 'msg-1',
        content: '',
      };

      (global.fetch as any).mockReturnValue(
        mockErrorResponse('VALIDATION_ERROR', 'Content cannot be empty')
      );

      // Act & Assert
      await expect(client.updateMessage(dto)).rejects.toThrow('Content cannot be empty');
    });
  });

  describe('deleteMessage', () => {
    it('应该成功删除消息', async () => {
      // Arrange
      const dto: DeleteMessageDTO = {
        messageId: 'msg-1',
        deletedBy: 'user-1',
      };

      (global.fetch as any).mockReturnValue(
        mockSuccessResponse({ messageId: 'msg-1', deleted: true })
      );

      // Act
      const result = await client.deleteMessage(dto);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/messages/msg-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedBy: 'user-1' }),
      });
      expect(result.deleted).toBe(true);
    });

    it('应该在删除失败时抛出异常', async () => {
      // Arrange
      const dto: DeleteMessageDTO = {
        messageId: 'msg-1',
        deletedBy: 'user-2',
      };

      (global.fetch as any).mockReturnValue(
        mockErrorResponse('FORBIDDEN', 'You can only delete your own messages')
      );

      // Act & Assert
      await expect(client.deleteMessage(dto)).rejects.toThrow(
        'You can only delete your own messages'
      );
    });
  });

  describe('addReaction', () => {
    it('应该成功添加反应', async () => {
      // Arrange
      const dto: ReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-1',
        emoji: '👍',
      };

      const mockMessage: MessageEntity = {
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-2',
        senderType: 'human',
        content: 'Hello',
        reactions: [{ emoji: '👍', userIds: ['user-1'] }],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:05:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMessage));

      // Act
      const result = await client.addReaction(dto);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/messages/msg-1/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1', emoji: '👍' }),
      });
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions![0].emoji).toBe('👍');
    });

    it('应该在添加反应失败时抛出异常', async () => {
      // Arrange
      const dto: ReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-1',
        emoji: '👍',
      };

      (global.fetch as any).mockReturnValue(
        mockErrorResponse('VALIDATION_ERROR', 'Invalid emoji')
      );

      // Act & Assert
      await expect(client.addReaction(dto)).rejects.toThrow('Invalid emoji');
    });
  });

  describe('removeReaction', () => {
    it('应该成功移除反应', async () => {
      // Arrange
      const dto: ReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-1',
        emoji: '👍',
      };

      const mockMessage: MessageEntity = {
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-2',
        senderType: 'human',
        content: 'Hello',
        reactions: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:05:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMessage));

      // Act
      const result = await client.removeReaction(dto);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/messages/msg-1/reactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1', emoji: '👍' }),
      });
      expect(result.reactions).toHaveLength(0);
    });

    it('应该在移除反应失败时抛出异常', async () => {
      // Arrange
      const dto: ReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-1',
        emoji: '👍',
      };

      (global.fetch as any).mockReturnValue(
        mockErrorResponse('NOT_FOUND', 'Reaction not found')
      );

      // Act & Assert
      await expect(client.removeReaction(dto)).rejects.toThrow('Reaction not found');
    });
  });

  // --------------------------------------------------------------------------
  // 频道相关 API 测试
  // --------------------------------------------------------------------------

  describe('getChannel', () => {
    it('应该获取频道详情', async () => {
      // Arrange
      const mockChannel: ChannelEntity = {
        id: 'channel-1',
        name: 'general',
        description: 'General discussion',
        type: 'public',
        projectId: 'project-1',
        createdBy: 'user-1',
        members: [
          {
            memberId: 'user-1',
            memberType: 'human',
            role: 'owner',
            joinedAt: '2024-01-01T00:00:00Z',
          },
        ],
        agentPool: ['agent-1', 'agent-2'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockChannel));

      // Act
      const result = await client.getChannel('channel-1');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/channels/channel-1');
      expect(result).toEqual(mockChannel);
      expect(result.name).toBe('general');
      expect(result.type).toBe('public');
    });

    it('应该在频道不存在时抛出异常', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        mockErrorResponse('NOT_FOUND', 'Channel not found')
      );

      // Act & Assert
      await expect(client.getChannel('invalid-channel')).rejects.toThrow('Channel not found');
    });
  });

  describe('getChannelMembers', () => {
    it('应该获取频道成员列表', async () => {
      // Arrange
      const mockMembers = {
        channelId: 'channel-1',
        members: [
          {
            memberId: 'user-1',
            memberType: 'human' as const,
            role: 'owner' as const,
            joinedAt: '2024-01-01T00:00:00Z',
          },
          {
            memberId: 'agent-1',
            memberType: 'agent' as const,
            role: 'member' as const,
            joinedAt: '2024-01-01T00:01:00Z',
          },
        ],
        total: 2,
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockMembers));

      // Act
      const result = await client.getChannelMembers('channel-1');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/channels/channel-1/members');
      expect(result.members).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.members[0].memberType).toBe('human');
      expect(result.members[1].memberType).toBe('agent');
    });

    it('应该在获取成员失败时抛出异常', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        mockErrorResponse('NOT_FOUND', 'Channel not found')
      );

      // Act & Assert
      await expect(client.getChannelMembers('invalid-channel')).rejects.toThrow(
        'Channel not found'
      );
    });
  });

  describe('getChannelAgents', () => {
    it('应该获取频道 Agent Pool', async () => {
      // Arrange
      const mockAgents = {
        channelId: 'channel-1',
        agentPool: ['agent-1', 'agent-2', 'agent-3'],
        total: 3,
      };

      (global.fetch as any).mockReturnValue(mockSuccessResponse(mockAgents));

      // Act
      const result = await client.getChannelAgents('channel-1');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/channels/channel-1/agents');
      expect(result.agentPool).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.agentPool).toContain('agent-1');
    });

    it('应该在获取 Agent Pool 失败时抛出异常', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        mockErrorResponse('NOT_FOUND', 'Channel not found')
      );

      // Act & Assert
      await expect(client.getChannelAgents('invalid-channel')).rejects.toThrow(
        'Channel not found'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 边界情况和错误处理测试
  // --------------------------------------------------------------------------

  describe('错误处理', () => {
    it('应该处理 success=false 但没有 error 对象的响应', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        Promise.resolve({
          json: () => Promise.resolve({ success: false }),
        } as Response)
      );

      // Act & Assert
      await expect(client.getMessage('msg-1')).rejects.toThrow('Failed to get message');
    });

    it('应该处理 success=true 但没有 data 的响应', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        Promise.resolve({
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      // Act & Assert
      await expect(client.getMessage('msg-1')).rejects.toThrow('Failed to get message');
    });

    it('应该处理 JSON 解析错误', async () => {
      // Arrange
      (global.fetch as any).mockReturnValue(
        Promise.resolve({
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response)
      );

      // Act & Assert
      await expect(client.getMessage('msg-1')).rejects.toThrow('Invalid JSON');
    });
  });
});
