/**
 * ChannelService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelService, CreateChannelDTO, UpdateChannelDTO, AddMemberDTO, RemoveMemberDTO, ChannelSendMessageDTO } from './channel.service';
import { ChannelCrudService } from './channel-crud.service';
import { ChannelQueryService } from './channel-query.service';
import { ChannelMemberService } from './channel-member.service';
import { ChannelLifecycleService } from './channel-lifecycle.service';
import { ChannelMessagingService } from './channel-messaging.service';
import { ChannelEntity, ChannelEntityProps } from '../../../domain/models/channel/channel.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import {
  ChannelNotFoundError,
  ChannelNotActiveError,
  ChannelNotArchivedError,
  MemberNotInChannelError,
} from './channel.errors';

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
  let mockCrudService: ChannelCrudService;
  let mockQueryService: ChannelQueryService;
  let mockMemberService: ChannelMemberService;
  let mockLifecycleService: ChannelLifecycleService;
  let mockMessagingService: ChannelMessagingService;

  beforeEach(() => {
    mockCrudService = {
      createChannel: vi.fn(),
      updateChannel: vi.fn(),
      deleteChannel: vi.fn(),
    } as unknown as ChannelCrudService;

    mockQueryService = {
      getChannelById: vi.fn(),
      canSendMessage: vi.fn(),
      getChannelsByProject: vi.fn(),
      getAllChannels: vi.fn(),
      getChannelsByType: vi.fn(),
      getChannelsByStatus: vi.fn(),
    } as unknown as ChannelQueryService;

    mockMemberService = {
      addMember: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as ChannelMemberService;

    mockLifecycleService = {
      archiveChannel: vi.fn(),
      activateChannel: vi.fn(),
    } as unknown as ChannelLifecycleService;

    mockMessagingService = {
      sendMessage: vi.fn(),
      getChannelMessages: vi.fn(),
    } as unknown as ChannelMessagingService;

    channelService = new ChannelService(
      mockCrudService,
      mockQueryService,
      mockMemberService,
      mockLifecycleService,
      mockMessagingService
    );
  });

  describe('createChannel', () => {
    it('should create a new channel successfully', async () => {
      const dto: CreateChannelDTO = {
        name: 'general',
        type: 'public',
        projectId: 'project-1',
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockChannel = createTestChannel();
      vi.mocked(mockCrudService.createChannel).mockResolvedValue(mockChannel);

      const result = await channelService.createChannel(dto);

      expect(result).toBe(mockChannel);
      expect(mockCrudService.createChannel).toHaveBeenCalledWith(dto);
    });

    it('should create channel with empty members if not provided', async () => {
      const dto: CreateChannelDTO = {
        name: 'general',
        type: 'public',
        projectId: 'project-1',
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockChannel = createTestChannel({ members: [] });
      vi.mocked(mockCrudService.createChannel).mockResolvedValue(mockChannel);

      const result = await channelService.createChannel(dto);

      expect(result.members).toEqual([]);
    });
  });

  describe('getChannelById', () => {
    it('should return channel when found', async () => {
      const mockChannel = createTestChannel();
      vi.mocked(mockQueryService.getChannelById).mockResolvedValue(mockChannel);

      const result = await channelService.getChannelById('channel-1');

      expect(result).toBe(mockChannel);
    });
  });

  describe('getChannelsByProject', () => {
    it('should return all channels for a project', async () => {
      const mockChannels = [
        createTestChannel({ channelId: 'channel-1' }),
        createTestChannel({ channelId: 'channel-2' }),
      ];

      vi.mocked(mockQueryService.getChannelsByProject).mockResolvedValue(mockChannels);

      const result = await channelService.getChannelsByProject('project-1');

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockChannels);
    });
  });

  describe('updateChannel', () => {
    it('should update channel successfully', async () => {
      const dto: UpdateChannelDTO = {
        channelId: 'channel-1',
        name: 'updated-general',
      };

      const updatedChannel = createTestChannel({ name: 'updated-general' });
      vi.mocked(mockCrudService.updateChannel).mockResolvedValue(updatedChannel);

      const result = await channelService.updateChannel(dto);

      expect(result.name).toBe('updated-general');
    });
  });

  describe('addMember', () => {
    it('should add member to channel successfully', async () => {
      const dto: AddMemberDTO = {
        channelId: 'channel-1',
        memberId: 'user-2',
        memberType: 'human',
        role: 'member',
      };

      const channelWithMember = createTestChannel({
        members: [{ memberId: 'user-2', memberType: 'human', role: 'member', joinedAt: new Date() }],
      });

      vi.mocked(mockMemberService.addMember).mockResolvedValue(channelWithMember);

      const result = await channelService.addMember(dto);

      expect(result.members).toHaveLength(1);
      expect(result.members[0]?.memberId).toBe('user-2');
    });

    it('should not add member if already in channel', async () => {
      const dto: AddMemberDTO = {
        channelId: 'channel-1',
        memberId: 'user-2',
        memberType: 'human',
        role: 'member',
      };

      const channelWithMember = createTestChannel({
        members: [{ memberId: 'user-2', memberType: 'human', role: 'member', joinedAt: new Date() }],
      });

      vi.mocked(mockMemberService.addMember).mockResolvedValue(channelWithMember);

      const result = await channelService.addMember(dto);

      expect(result.members).toHaveLength(1);
    });
  });

  describe('removeMember', () => {
    it('should remove member from channel successfully', async () => {
      const dto: RemoveMemberDTO = {
        channelId: 'channel-1',
        memberId: 'user-2',
      };

      const channelWithoutMember = createTestChannel({ members: [] });
      vi.mocked(mockMemberService.removeMember).mockResolvedValue(channelWithoutMember);

      const result = await channelService.removeMember(dto);

      expect(result.members).toHaveLength(0);
    });

    it('should not remove member if not in channel', async () => {
      const dto: RemoveMemberDTO = {
        channelId: 'channel-1',
        memberId: 'user-2',
      };

      vi.mocked(mockMemberService.removeMember).mockRejectedValue(
        new MemberNotInChannelError('user-2', 'channel-1')
      );

      await expect(channelService.removeMember(dto)).rejects.toThrow(MemberNotInChannelError);
    });
  });

  describe('sendMessage', () => {
    it('should send message to channel successfully', async () => {
      const dto: ChannelSendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello, channel!',
      };

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockMessagingService.sendMessage).mockResolvedValue(mockMessage);

      const result = await channelService.sendMessage(dto);

      expect(result).toBe(mockMessage);
      expect(result.content).toBe('Hello, channel!');
    });
  });

  describe('getChannelMessages', () => {
    it('should return all messages for a channel', async () => {
      const mockMessages = [
        MessageEntity.create({
          messageId: 'msg-1',
          msgShortId: 'msg-short-1',
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Message 1',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          createdAt: new Date(),
          updatedAt: new Date(),
          mentions: [],
          reactions: [],
        }),
        MessageEntity.create({
          messageId: 'msg-2',
          msgShortId: 'msg-short-2',
          channelId: 'channel-1',
          senderId: 'user-2',
          senderType: 'human',
          content: 'Message 2',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          createdAt: new Date(),
          updatedAt: new Date(),
          mentions: [],
          reactions: [],
        }),
      ];

      vi.mocked(mockMessagingService.getChannelMessages).mockResolvedValue(mockMessages);

      const result = await channelService.getChannelMessages('channel-1');

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockMessages);
    });
  });

  describe('archiveChannel', () => {
    it('should archive channel successfully', async () => {
      const archivedChannel = createTestChannel({ status: 'archived' });
      vi.mocked(mockLifecycleService.archiveChannel).mockResolvedValue(archivedChannel);

      const result = await channelService.archiveChannel('channel-1');

      expect(result.status).toBe('archived');
    });
  });

  describe('activateChannel', () => {
    it('should activate channel successfully', async () => {
      const activeChannel = createTestChannel({ status: 'active' });
      vi.mocked(mockLifecycleService.activateChannel).mockResolvedValue(activeChannel);

      const result = await channelService.activateChannel('channel-1');

      expect(result.status).toBe('active');
    });
  });

  describe('deleteChannel', () => {
    it('should delete archived channel successfully', async () => {
      vi.mocked(mockCrudService.deleteChannel).mockResolvedValue(undefined);

      await expect(channelService.deleteChannel('channel-1')).resolves.toBeUndefined();
      expect(mockCrudService.deleteChannel).toHaveBeenCalledWith('channel-1');
    });
  });
});
