import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { channelRouter } from './channel.router';
import { ChannelService } from '../../../application/services/channel/channel.service';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { TRPCError } from '@trpc/server';
import {
  ChannelNotFoundError,
  ChannelAlreadyExistsError,
  MemberAlreadyInChannelError
} from '../../../application/services/channel/channel.errors';

describe('channelRouter', () => {
  let mockChannelService: ChannelService;
  let router: ReturnType<typeof channelRouter>;
  let mockContext: any;

  beforeEach(() => {
    mockChannelService = {
      getChannelsByProject: vi.fn(),
      getAllChannels: vi.fn(),
      getChannelById: vi.fn(),
      createChannel: vi.fn(),
      updateChannel: vi.fn(),
      deleteChannel: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as ChannelService;

    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };

    router = channelRouter(mockChannelService);
  });

  describe('list', () => {
    it('should list all channels when no projectId provided', async () => {
      const channels = [
        ChannelEntity.create({
          channelId: 'channel-1',
          name: 'Channel 1',
          displayName: 'Channel 1',
          type: 'public',
          status: 'active',
          members: [],
          agentPool: [],
          taskPool: [],
          conversationPool: [],
          communicationRules: {
            allowMentions: true,
            allowThreads: true,
            allowAttachments: true,
            maxMessageLength: 5000,
          },
          workspace: { root: '', sharedFiles: [], attachments: [] },
          meta: {
            messageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: { id: 'user-1', type: 'human' },
          },
        }),
        ChannelEntity.create({
          channelId: 'channel-2',
          name: 'Channel 2',
          displayName: 'Channel 2',
          type: 'private',
          status: 'active',
          members: [],
          agentPool: [],
          taskPool: [],
          conversationPool: [],
          communicationRules: {
            allowMentions: true,
            allowThreads: true,
            allowAttachments: true,
            maxMessageLength: 5000,
          },
          workspace: { root: '', sharedFiles: [], attachments: [] },
          meta: {
            messageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: { id: 'user-1', type: 'human' },
          },
        }),
      ];

      vi.mocked(mockChannelService.getAllChannels).mockResolvedValue(channels);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({});

      expect(result.channels).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockChannelService.getAllChannels).toHaveBeenCalled();
    });

    it('should list channels by projectId', async () => {
      const channels = [
        ChannelEntity.create({
          channelId: 'channel-1',
          name: 'Channel 1',
          displayName: 'Channel 1',
          type: 'public',
          status: 'active',
          projectId: 'project-1',
          members: [],
          agentPool: [],
          taskPool: [],
          conversationPool: [],
          communicationRules: {
            allowMentions: true,
            allowThreads: true,
            allowAttachments: true,
            maxMessageLength: 5000,
          },
          workspace: { root: '', sharedFiles: [], attachments: [] },
          meta: {
            messageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: { id: 'user-1', type: 'human' },
          },
        }),
      ];

      vi.mocked(mockChannelService.getChannelsByProject).mockResolvedValue(channels);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ projectId: 'project-1' });

      expect(result.channels).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockChannelService.getChannelsByProject).toHaveBeenCalledWith('project-1');
    });

    it('should throw INTERNAL_SERVER_ERROR on failure', async () => {
      vi.mocked(mockChannelService.getAllChannels).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({});
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getById', () => {
    it('should get channel by id successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      vi.mocked(mockChannelService.getChannelById).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ channelId: 'channel-1' });

      expect(result).toEqual(channel.toJSON());
      expect(mockChannelService.getChannelById).toHaveBeenCalledWith('channel-1');
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.getChannelById).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.getById({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockChannelService.getChannelById).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.getById({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('create', () => {
    it('should create channel successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'New Channel',
        displayName: 'New Channel',
        description: 'Test description',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      vi.mocked(mockChannelService.createChannel).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        name: 'New Channel',
        description: 'Test description',
        type: 'public',
        createdBy: 'user-1',
      });

      expect(result).toEqual(channel.toJSON());
      expect(mockChannelService.createChannel).toHaveBeenCalledWith({
        name: 'New Channel',
        description: 'Test description',
        type: 'public',
        createdBy: 'user-1',
      });
    });

    it('should throw CONFLICT when channel already exists', async () => {
      vi.mocked(mockChannelService.createChannel).mockRejectedValue(
        new ChannelAlreadyExistsError('New Channel')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.create({
          name: 'New Channel',
          type: 'public',
          createdBy: 'user-1',
        });
      } catch (err: any) {
        expect(err.code).toBe('CONFLICT');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockChannelService.createChannel).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.create({
          name: 'New Channel',
          type: 'public',
          createdBy: 'user-1',
        });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('update', () => {
    it('should update channel successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Updated Channel',
        displayName: 'Updated Channel',
        description: 'Updated description',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      vi.mocked(mockChannelService.updateChannel).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.update({
        channelId: 'channel-1',
        data: {
          name: 'Updated Channel',
          description: 'Updated description',
        },
      });

      expect(result).toEqual(channel.toJSON());
      expect(mockChannelService.updateChannel).toHaveBeenCalledWith('channel-1', {
        name: 'Updated Channel',
        description: 'Updated description',
      });
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.updateChannel).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          channelId: 'channel-1',
          data: { name: 'Updated' },
        });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockChannelService.updateChannel).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          channelId: 'channel-1',
          data: { name: 'Updated' },
        });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('delete', () => {
    it('should delete channel successfully', async () => {
      vi.mocked(mockChannelService.deleteChannel).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ channelId: 'channel-1' });

      expect(result).toEqual({ channelId: 'channel-1', deleted: true });
      expect(mockChannelService.deleteChannel).toHaveBeenCalledWith('channel-1');
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.deleteChannel).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockChannelService.deleteChannel).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getMembers', () => {
    it('should get channel members successfully', async () => {
      let channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      channel = channel.addMember({ memberId: 'user-1', memberType: 'human', role: 'owner', joinedAt: new Date() });
      channel = channel.addMember({ memberId: 'user-2', memberType: 'human', role: 'member', joinedAt: new Date() });

      vi.mocked(mockChannelService.getChannelById).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.getMembers({ channelId: 'channel-1' });

      expect(result.channelId).toBe('channel-1');
      expect(result.members).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.getChannelById).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.getMembers({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('addMember', () => {
    it('should add member successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      vi.mocked(mockChannelService.addMember).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.addMember({
        channelId: 'channel-1',
        memberId: 'user-2',
      });

      expect(result).toEqual(channel.toJSON());
      expect(mockChannelService.addMember).toHaveBeenCalledWith({
        channelId: 'channel-1',
        memberId: 'user-2',
      });
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.addMember).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.addMember({
          channelId: 'channel-1',
          memberId: 'user-2',
        });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw CONFLICT when member already exists', async () => {
      vi.mocked(mockChannelService.addMember).mockRejectedValue(
        new MemberAlreadyInChannelError('user-2', 'channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.addMember({
          channelId: 'channel-1',
          memberId: 'user-2',
        });
      } catch (err: any) {
        expect(err.code).toBe('CONFLICT');
      }
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      vi.mocked(mockChannelService.removeMember).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.removeMember({
        channelId: 'channel-1',
        memberId: 'user-2',
      });

      expect(result).toEqual(channel.toJSON());
      expect(mockChannelService.removeMember).toHaveBeenCalledWith({
        channelId: 'channel-1',
        memberId: 'user-2',
      });
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.removeMember).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.removeMember({
          channelId: 'channel-1',
          memberId: 'user-2',
        });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('getAgents', () => {
    it('should get channel agents successfully', async () => {
      let channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 5000,
        },
        workspace: { root: '', sharedFiles: [], attachments: [] },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        },
      });

      channel = channel.addAgent('agent-1');
      channel = channel.addAgent('agent-2');

      vi.mocked(mockChannelService.getChannelById).mockResolvedValue(channel);

      const caller = router.createCaller(mockContext);
      const result = await caller.getAgents({ channelId: 'channel-1' });

      expect(result.channelId).toBe('channel-1');
      expect(result.agentPool).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockChannelService.getChannelById).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.getAgents({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });
  });
});
