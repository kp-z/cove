/**
 * MessageCrudService 单元测试
 *
 * 重点验证根因修复：sendMessage() 无论是人类消息（message.send）
 * 还是 Agent 消息（message.saveResponse），最终都经由本服务落库，
 * 落库成功后必须调用 channelQueryService.incrementMessageCount()
 * 刷新 Channel 的活跃时间戳（meta.updated_at），否则 Channel 列表的
 * "最近更新"角标不会随消息发送刷新。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageCrudService } from './message-crud.service';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IMessageRepository,
  IEventBus,
  ILogger,
  IChannelQueryService,
} from '../../interfaces';
import { UserService } from '../user/user.service';
import { RealmContext } from '../../context/realm-context';
import { runWithContext } from '../../context/realm-context-store';

function buildChannel(overrides: { agentPool?: string[] } = {}): ChannelEntity {
  return ChannelEntity.create({
    channelId: 'channel-1',
    realmId: 'test-server-id',
    name: 'general',
    displayName: 'General',
    type: 'public',
    status: 'active',
    members: [
      { memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() },
      { memberId: 'agent-1', memberType: 'agent', role: 'member', joinedAt: new Date() },
    ],
    agentPool: overrides.agentPool ?? ['agent-1'],
    taskPool: [],
    conversationPool: [],
    communicationRules: {
      allowMentions: true,
      allowThreads: true,
      allowAttachments: true,
      maxMessageLength: 10000,
    },
    workspace: { root: '', sharedFiles: '', attachments: '' },
    meta: {
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'user-1', type: 'human' },
    },
  });
}

describe('MessageCrudService', () => {
  let service: MessageCrudService;
  let mockMessageRepository: IMessageRepository & { prisma: any };
  let mockChannelQueryService: IChannelQueryService;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let mockUserService: UserService;
  let testContext: RealmContext;

  beforeEach(() => {
    testContext = RealmContext.create('test-server-id', 'test-user-id');

    mockMessageRepository = {
      findById: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      prisma: {
        agent: {
          findUnique: vi.fn().mockResolvedValue({ id: 'agent-1', displayName: 'Agent One', name: 'agent-1' }),
        },
      },
    } as unknown as IMessageRepository & { prisma: any };

    mockChannelQueryService = {
      canSendMessage: vi.fn().mockResolvedValue({ allowed: true }),
      getChannelById: vi.fn().mockResolvedValue(buildChannel()),
      incrementMessageCount: vi.fn().mockResolvedValue(undefined),
    } as unknown as IChannelQueryService;

    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as IEventBus;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as ILogger;

    mockUserService = {
      getUserById: vi.fn().mockResolvedValue({ displayName: 'User One', username: 'user1', email: 'user1@test.com' }),
    } as unknown as UserService;

    service = new MessageCrudService(
      mockMessageRepository,
      mockChannelQueryService,
      mockEventBus,
      mockLogger,
      mockUserService
    );
  });

  describe('sendMessage — Channel 活跃时间戳刷新（根因修复）', () => {
    it('用户（human）发送消息后应刷新 Channel 活跃时间戳', async () => {
      await runWithContext(testContext, () =>
        service.sendMessage({
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Hello from user',
        })
      );

      expect(mockChannelQueryService.incrementMessageCount).toHaveBeenCalledWith('channel-1');
      expect(mockChannelQueryService.incrementMessageCount).toHaveBeenCalledTimes(1);
    });

    it('Agent 发送消息后同样应刷新 Channel 活跃时间戳', async () => {
      await runWithContext(testContext, () =>
        service.sendMessage({
          channelId: 'channel-1',
          senderId: 'agent-1',
          senderType: 'agent',
          content: 'Hello from agent',
        })
      );

      expect(mockChannelQueryService.incrementMessageCount).toHaveBeenCalledWith('channel-1');
      expect(mockChannelQueryService.incrementMessageCount).toHaveBeenCalledTimes(1);
    });

    it('刷新 Channel 活跃时间戳失败时，不应影响消息发送本身', async () => {
      vi.mocked(mockChannelQueryService.incrementMessageCount).mockRejectedValue(
        new Error('channel update failed')
      );

      const result = await runWithContext(testContext, () =>
        service.sendMessage({
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Hello',
        })
      );

      expect(result.content).toBe('Hello');
      expect(mockMessageRepository.save).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to update channel activity timestamp',
        expect.objectContaining({ channelId: 'channel-1' })
      );
    });

    it('幂等命中已存在消息时不应重复刷新 Channel 活跃时间戳', async () => {
      const existing = (await runWithContext(testContext, () =>
        service.sendMessage({
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Original',
          messageId: 'message-fixed-id',
        })
      ));
      vi.mocked(mockMessageRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockChannelQueryService.incrementMessageCount).mockClear();

      const result = await runWithContext(testContext, () =>
        service.sendMessage({
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Original',
          messageId: 'message-fixed-id',
        })
      );

      expect(result).toBe(existing);
      expect(mockChannelQueryService.incrementMessageCount).not.toHaveBeenCalled();
    });
  });
});
