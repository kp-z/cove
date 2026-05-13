/**
 * ChannelService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelService, ChannelNotFoundError, ChannelNotActiveError, ChannelNotArchivedError, MemberNotInChannelError } from './channel.service';
import { ChannelEntity, ChannelEntityProps } from '../../../01-domain/models/channel/channel.entity';
import { MessageEntity } from '../../../01-domain/models/message/message.entity';
import {
  IChannelRepository,
  IMessageRepository,
  IEventBus,
  ILogger,
} from '../interfaces';

// Helper function to create valid ChannelEntity test instances
function createTestChannel(overrides: Partial<ChannelEntityProps> = {}): ChannelEntity {
  const defaults: ChannelEntityProps = {
    channelId: 'channel-1',
    name: 'general',
    displayName: 'General',
    type: 'public',
    status: 'active',
    projectId: 'project-1',
    description: 'Test channel',
    members: [],
    agentPool: [],
    taskPool: [],
    conversationPool: [],
    communicationRules: {
      allowMentions: true,
      allowThreads: true,
      allowAttachments: true,
      maxMessageLength: 10000,
      rateLimit: {
        messagesPerMinute: 60,
        enabled: true,
      },
    },
    workspace: {
      root: '/workspace/test',
      sharedFiles: '/workspace/test/shared',
      attachments: '/workspace/test/attachments',
    },
    meta: {
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: 'user-1',
        type: 'human',
      },
    },
  };

  return ChannelEntity.create({ ...defaults, ...overrides });
}

describe('ChannelService', () => {
  let channelService: ChannelService;
  let mockChannelRepository: IChannelRepository;
  let mockMessageRepository: IMessageRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Mock ChannelRepository
    mockChannelRepository = {
      findById: vi.fn(),
      findByProject: vi.fn(),
      findByType: vi.fn(),
      findByStatus: vi.fn(),
      findDMChannel: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // Mock MessageRepository
    mockMessageRepository = {
      findById: vi.fn(),
      findByChannel: vi.fn(),
      findByChannelCursor: vi.fn(),
      countRecentByChannelAndSender: vi.fn().mockResolvedValue(0),
      findByChannelId: vi.fn(),
      findByThreadId: vi.fn(),
      findBySender: vi.fn(),
      findByThread: vi.fn(),
      findByStatus: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      markAsRead: vi.fn(),
    };

    // Mock EventBus
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };

    channelService = new ChannelService(
      mockChannelRepository,
      mockMessageRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('createChannel', () => {
    it('should create a new channel successfully', async () => {
      const dto = {
        name: 'general',
        description: 'General discussion',
        type: 'public' as const,
        projectId: 'project-1',
        createdBy: 'user-1',
        memberIds: ['user-1', 'user-2'],
      };

      const result = await channelService.createChannel(dto);

      expect(result).toBeInstanceOf(ChannelEntity);
      expect(result.name).toBe('general');
      expect(result.type).toBe('public');
      expect(result.members).toHaveLength(2);
      expect(mockChannelRepository.save).toHaveBeenCalledWith(result);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.created',
          aggregateType: 'Channel',
        })
      );
    });

    it('should create channel with empty members if not provided', async () => {
      const dto = {
        name: 'general',
        type: 'public' as const,
        projectId: 'project-1',
        createdBy: 'user-1',
      };

      const result = await channelService.createChannel(dto);

      expect(result.members).toEqual([]);
    });
  });

  describe('getChannelById', () => {
    it('should return channel when found', async () => {
      const mockChannel = createTestChannel();

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.getChannelById('channel-1');

      expect(result).toBe(mockChannel);
      expect(mockChannelRepository.findById).toHaveBeenCalledWith('channel-1');
    });

    it('should throw ChannelNotFoundError when channel does not exist', async () => {
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(null);

      await expect(channelService.getChannelById('channel-1')).rejects.toThrow(
        ChannelNotFoundError
      );
    });
  });

  describe('getChannelsByProject', () => {
    it('should return all channels for a project', async () => {
      const mockChannels = [
        createTestChannel({ channelId: 'channel-1', name: 'general' }),
        createTestChannel({ channelId: 'channel-2', name: 'dev' }),
      ];

      vi.mocked(mockChannelRepository.findByProject).mockResolvedValue(mockChannels);

      const result = await channelService.getChannelsByProject('project-1');

      expect(result).toEqual(mockChannels);
      expect(mockChannelRepository.findByProject).toHaveBeenCalledWith('project-1');
    });
  });

  describe.skip('updateChannel', () => {
    it('should update channel successfully', async () => {
      const mockChannel = createTestChannel();

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.updateChannel('channel-1', {
        name: 'general-updated',
        description: 'Updated description',
      });

      expect(result.name).toBe('general-updated');
      expect(result.description).toBe('Updated description');
      expect(mockChannelRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.updated',
        })
      );
    });

    it('should throw ChannelNotFoundError when channel does not exist', async () => {
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(null);

      await expect(
        channelService.updateChannel('channel-1', { name: 'new-name' })
      ).rejects.toThrow(ChannelNotFoundError);
    });
  });

  describe('addMember', () => {
    it('should add member to channel successfully', async () => {
      const mockChannel = createTestChannel({
        members: [{
          memberId: 'user-1',
          memberType: 'human',
          role: 'member',
          joinedAt: new Date(),
        }],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.addMember({
        channelId: 'channel-1',
        memberId: 'user-2',
      });

      expect(result.members.some(m => m.memberId === 'user-2')).toBe(true);
      expect(mockChannelRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.member_added',
        })
      );
    });

    it('should not add member if already in channel', async () => {
      const mockChannel = createTestChannel({
        members: [
          {
            memberId: 'user-1',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
          {
            memberId: 'user-2',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.addMember({
        channelId: 'channel-1',
        memberId: 'user-2',
      });

      expect(result).toBe(mockChannel);
      expect(mockChannelRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member from channel successfully', async () => {
      const mockChannel = createTestChannel({
        members: [
          {
            memberId: 'user-1',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
          {
            memberId: 'user-2',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.removeMember({
        channelId: 'channel-1',
        memberId: 'user-2',
      });

      expect(result.members.some(m => m.memberId === 'user-2')).toBe(false);
      expect(mockChannelRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.member_removed',
        })
      );
    });

    it('should not remove member if not in channel', async () => {
      const mockChannel = createTestChannel({
        members: [{
          memberId: 'user-1',
          memberType: 'human',
          role: 'member',
          joinedAt: new Date(),
        }],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.removeMember({
        channelId: 'channel-1',
        memberId: 'user-2',
      });

      expect(result).toBe(mockChannel);
      expect(mockChannelRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe.skip('sendMessage', () => {
    it('should send message to channel successfully', async () => {
      const mockChannel = createTestChannel({
        members: [{
          memberId: 'user-1',
          memberType: 'human',
          role: 'member',
          joinedAt: new Date(),
        }],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.sendMessage({
        channelId: 'channel-1',
        content: 'Hello world',
        senderId: 'user-1',
      });

      expect(result).toBeInstanceOf(MessageEntity);
      expect(result.content).toBe('Hello world');
      expect(result.senderId).toBe('user-1');
      expect(mockMessageRepository.save).toHaveBeenCalledWith(result);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.sent',
        })
      );
    });

    it('should throw ChannelNotActiveError when channel is not active', async () => {
      const mockChannel = createTestChannel({
        members: [{
          memberId: 'user-1',
          memberType: 'human',
          role: 'member',
          joinedAt: new Date(),
        }],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      await expect(
        channelService.sendMessage({
          channelId: 'channel-1',
          content: 'Hello',
          senderId: 'user-1',
        })
      ).rejects.toThrow(ChannelNotActiveError);
    });

    it('should throw MemberNotInChannelError when sender is not a member', async () => {
      const mockChannel = createTestChannel({
        members: [{
          memberId: 'user-1',
          memberType: 'human',
          role: 'member',
          joinedAt: new Date(),
        }],
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      await expect(
        channelService.sendMessage({
          channelId: 'channel-1',
          content: 'Hello',
          senderId: 'user-2',
        })
      ).rejects.toThrow(MemberNotInChannelError);
    });
  });

  describe.skip('getChannelMessages', () => {
    it('should return all messages for a channel', async () => {
      const mockChannel = createTestChannel();

      const mockMessages = [
        MessageEntity.create({
          messageId: 'msg-1',
          channelId: 'channel-1',
          senderId: 'user-1',
          content: 'Hello',
          attachments: [],
          reactions: [],
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);
      vi.mocked(mockMessageRepository.findByChannelId).mockResolvedValue(mockMessages);

      const result = await channelService.getChannelMessages('channel-1');

      expect(result).toEqual(mockMessages);
      expect(mockMessageRepository.findByChannelId).toHaveBeenCalledWith('channel-1', undefined);
    });
  });

  describe.skip('archiveChannel', () => {
    it('should archive channel successfully', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectId: 'project-1',
        status: 'active',
        memberIds: [],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.archiveChannel('channel-1');

      expect(result.status).toBe('archived');
      expect(mockChannelRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.archived',
        })
      );
    });
  });

  describe.skip('activateChannel', () => {
    it('should activate channel successfully', async () => {
      const mockChannel = createTestChannel();

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      const result = await channelService.activateChannel('channel-1');

      expect(result.status).toBe('active');
      expect(mockChannelRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.activated',
        })
      );
    });
  });

  describe.skip('deleteChannel', () => {
    it('should delete archived channel successfully', async () => {
      const mockChannel = createTestChannel();

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      await channelService.deleteChannel('channel-1');

      expect(mockChannelRepository.delete).toHaveBeenCalledWith('channel-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.deleted',
        })
      );
    });

    it('should throw ChannelNotArchivedError when channel is not archived', async () => {
      const mockChannel = createTestChannel();

      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockChannel);

      await expect(channelService.deleteChannel('channel-1')).rejects.toThrow(
        ChannelNotArchivedError
      );
    });
  });
});
