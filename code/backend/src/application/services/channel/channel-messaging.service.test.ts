import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelMessagingService } from './channel-messaging.service';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelNotFoundError, ChannelNotActiveError, MemberNotInChannelError } from './channel.errors';
import {
  IChannelRepository,
  IMessageRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

describe('ChannelMessagingService', () => {
  let service: ChannelMessagingService;
  let mockChannelRepository: IChannelRepository;
  let mockMessageRepository: IMessageRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'test-user-id');
    mockChannelRepository = {
      findById: vi.fn(),
    } as unknown as IChannelRepository;

    mockMessageRepository = {
      save: vi.fn(),
      findByChannel: vi.fn(),
      findByThread: vi.fn(),
    } as unknown as IMessageRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new ChannelMessagingService(
      mockChannelRepository,
      mockMessageRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [{ memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() }],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      const result = await runWithContext(testContext, async () => {
        return await service.sendMessage({
          channelId: 'channel-1',
          content: 'Test message',
          senderId: 'user-1',
        });
      });

      expect(result).toBeInstanceOf(MessageEntity);
      expect(result.content).toBe('Test message');
      expect(result.channelId).toBe('channel-1');
      expect(result.senderId).toBe('user-1');
      expect(mockMessageRepository.save).toHaveBeenCalledWith(expect.any(MessageEntity), 'test-server-id');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.sent',
        })
      );
    });

    it('should send message with thread', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [{ memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() }],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      const result = await runWithContext(testContext, async () => {
        return await service.sendMessage({
          channelId: 'channel-1',
          content: 'Thread reply',
          senderId: 'user-1',
          threadId: 'msg-1',
        });
      });

      expect(result.threadId).toBe('msg-1');
      expect(result.isThreadRoot).toBe(false);
    });

    it('should throw ChannelNotFoundError when channel not found', async () => {
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return await service.sendMessage({
            channelId: 'nonexistent',
            content: 'Test',
            senderId: 'user-1',
          });
        })
      ).rejects.toThrow(ChannelNotFoundError);
    });

    it('should throw ChannelNotActiveError when channel not active', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'archived',
        members: [{ memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() }],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      await expect(
        runWithContext(testContext, async () => {
          return await service.sendMessage({
            channelId: 'channel-1',
            content: 'Test',
            senderId: 'user-1',
          });
        })
      ).rejects.toThrow(ChannelNotActiveError);
    });

    it('should throw MemberNotInChannelError when sender not in channel', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [{ memberId: 'user-2', memberType: 'human', role: 'member', joinedAt: new Date() }],
        createdBy: 'user-2',
        createdAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      await expect(
        runWithContext(testContext, async () => {
          return await service.sendMessage({
            channelId: 'channel-1',
            content: 'Test',
            senderId: 'user-1',
          });
        })
      ).rejects.toThrow(MemberNotInChannelError);
    });

    it('should log error when event publishing fails but not throw', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [{ memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() }],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      await expect(
        runWithContext(testContext, async () => {
          return await service.sendMessage({
            channelId: 'channel-1',
            content: 'Test',
            senderId: 'user-1',
          });
        })
      ).resolves.toBeDefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'message.sent',
        })
      );
    });
  });

  describe('getChannelMessages', () => {
    it('should get channel messages successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        memberIds: [],
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      const messages = [
        MessageEntity.create({
          messageId: 'msg-1',
          msgShortId: 'short-1',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-1',
          senderName: 'User 1',
          senderType: 'human',
          content: 'Message 1',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          isThreadRoot: true,
          attachments: [],
          mentions: [],
          references: [],
          reactions: [],
          isEdited: false,
          editHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: { client: 'web', isPinned: false, isImportant: false },
        }),
      ];

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);
      vi.mocked(mockMessageRepository.findByChannel).mockResolvedValue(messages);

      const result = await service.getChannelMessages('channel-1', 20);

      expect(result).toEqual(messages);
      expect(mockMessageRepository.findByChannel).toHaveBeenCalledWith('channel-1', 20);
    });

    it('should throw ChannelNotFoundError when channel not found', async () => {
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(null);

      await expect(
        service.getChannelMessages('nonexistent')
      ).rejects.toThrow(ChannelNotFoundError);
    });
  });

  describe('getThreadMessages', () => {
    it('should get thread messages successfully', async () => {
      const messages = [
        MessageEntity.create({
          messageId: 'msg-2',
          msgShortId: 'short-2',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-2',
          senderName: 'User 2',
          senderType: 'human',
          content: 'Reply',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          threadId: 'msg-1',
          isThreadRoot: false,
          attachments: [],
          mentions: [],
          references: [],
          reactions: [],
          isEdited: false,
          editHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: { client: 'web', isPinned: false, isImportant: false },
        }),
      ];

      vi.mocked(mockMessageRepository.findByThread).mockResolvedValue(messages);

      const result = await service.getThreadMessages('msg-1');

      expect(result).toEqual(messages);
      expect(mockMessageRepository.findByThread).toHaveBeenCalledWith('msg-1');
    });
  });
});
