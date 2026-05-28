/**
 * AgentAvatarSyncHandler 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentAvatarSyncHandler } from './agent-avatar-sync.handler';
import { DomainEvent } from '../../../application/interfaces/event-bus.interface';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { IAgentRepository } from '../../../application/interfaces/repositories/agent.repository.interface';
import { IChannelRepository } from '../../../application/interfaces/repositories/channel.repository.interface';
import { ChannelQueryService } from '../../../application/services/channel/channel-query.service';
import { ILogger } from '../../../application/interfaces';

describe('AgentAvatarSyncHandler', () => {
  let handler: AgentAvatarSyncHandler;
  let mockAgentRepository: IAgentRepository;
  let mockChannelQueryService: ChannelQueryService;
  let mockChannelRepository: IChannelRepository;
  let mockLogger: ILogger;

  const mockAvatar = {
    url: 'https://example.com/avatar.png',
    type: 'uploaded' as const,
  };

  const mockAgent = AgentEntity.create({
    agentId: 'agent-1',
    realmId: 'realm-1',
    name: 'Test Agent',
    displayName: 'Test Agent',
    status: 'active',
    scope: 'user',
    persona: {
      name: 'Test Agent',
      role: 'assistant',
      avatar: mockAvatar,
    },
    createdBy: 'user-1',
    createdAt: new Date(),
  });

  const mockDMChannel = ChannelEntity.createDMChannel({
    channelId: 'channel-1',
    realmId: 'realm-1',
    agentId: 'agent-1',
    userId: 'user-1',
    name: 'DM with Test Agent',
    avatar: {
      url: 'https://example.com/old-avatar.png',
      type: 'uploaded',
    },
    createdBy: { id: 'user-1', type: 'human' },
  });

  beforeEach(() => {
    mockAgentRepository = {
      findById: vi.fn(),
      findByStatus: vi.fn(),
      findByCreator: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockChannelQueryService = {
      getAllChannels: vi.fn(),
      getChannelById: vi.fn(),
      canSendMessage: vi.fn(),
      getChannelsByType: vi.fn(),
      getChannelsByStatus: vi.fn(),
      getChannelsByMember: vi.fn(),
      getAgentDMChannel: vi.fn(),
      findByRealmAndName: vi.fn(),
    } as any;

    mockChannelRepository = {
      findById: vi.fn(),
      findByProject: vi.fn(),
      findByType: vi.fn(),
      findByMember: vi.fn(),
      findAgentDMChannel: vi.fn(),
      findByRealmAndName: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    handler = new AgentAvatarSyncHandler(
      mockAgentRepository,
      mockChannelQueryService,
      mockChannelRepository,
      mockLogger
    );
  });

  describe('handle', () => {
    it('should skip non-agent.updated events', async () => {
      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.created',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1' },
      };

      await handler.handle(event);

      expect(mockAgentRepository.findById).not.toHaveBeenCalled();
    });

    it('should skip if realmId is missing', async () => {
      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', changes: {} },
      };

      await handler.handle(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Missing realmId in event payload',
        { agentId: 'agent-1' }
      );
      expect(mockAgentRepository.findById).not.toHaveBeenCalled();
    });

    it('should skip if agent not found', async () => {
      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(null);

      await handler.handle(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Agent not found',
        { agentId: 'agent-1' }
      );
    });

    it('should skip if agent has no avatar', async () => {
      const agentWithoutAvatar = AgentEntity.create({
        agentId: 'agent-1',
        realmId: 'realm-1',
        name: 'Test Agent',
        displayName: 'Test Agent',
        status: 'active',
        scope: 'user',
        persona: {
          name: 'Test Agent',
          role: 'assistant',
        },
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(agentWithoutAvatar);

      await handler.handle(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Agent has no avatar, skipping sync',
        { agentId: 'agent-1' }
      );
    });

    it('should skip if no DM channels found', async () => {
      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.mocked(mockChannelQueryService.getAllChannels).mockResolvedValue([]);

      await handler.handle(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] No DM channels found for agent',
        { agentId: 'agent-1' }
      );
    });

    it('should sync avatar to DM channels', async () => {
      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.mocked(mockChannelQueryService.getAllChannels).mockResolvedValue([mockDMChannel]);
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(mockDMChannel);
      vi.mocked(mockChannelRepository.update).mockResolvedValue();

      // Verify the mock channel is correctly set up
      expect(mockDMChannel.type).toBe('dm');
      expect(mockDMChannel.agentPool).toEqual(['agent-1']);
      expect(mockDMChannel.isDMWithAgent('agent-1')).toBe(true);

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Syncing avatar to DM channels',
        {
          agentId: 'agent-1',
          channelCount: 1,
          avatar: mockAvatar,
        }
      );

      expect(mockChannelRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
        }),
        'realm-1'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Avatar synced successfully',
        {
          agentId: 'agent-1',
          channelCount: 1,
        }
      );
    });

    it('should handle multiple DM channels', async () => {
      const mockDMChannel2 = ChannelEntity.createDMChannel({
        channelId: 'channel-2',
        realmId: 'realm-1',
        agentId: 'agent-1',
        userId: 'user-2',
        name: 'DM with Test Agent',
        createdBy: { id: 'user-2', type: 'human' },
      });

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.mocked(mockChannelQueryService.getAllChannels).mockResolvedValue([
        mockDMChannel,
        mockDMChannel2,
      ]);
      vi.mocked(mockChannelRepository.findById).mockImplementation(async (channelId) => {
        if (channelId === 'channel-1') return mockDMChannel;
        if (channelId === 'channel-2') return mockDMChannel2;
        return null;
      });
      vi.mocked(mockChannelRepository.update).mockResolvedValue();

      await handler.handle(event);

      expect(mockChannelRepository.update).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Avatar synced successfully',
        {
          agentId: 'agent-1',
          channelCount: 2,
        }
      );
    });

    it('should skip update if avatar already up-to-date', async () => {
      const channelWithSameAvatar = ChannelEntity.createDMChannel({
        channelId: 'channel-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        userId: 'user-1',
        name: 'DM with Test Agent',
        avatar: mockAvatar,
        createdBy: { id: 'user-1', type: 'human' },
      });

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.mocked(mockChannelQueryService.getAllChannels).mockResolvedValue([channelWithSameAvatar]);
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channelWithSameAvatar);

      await handler.handle(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Channel avatar already up-to-date',
        { channelId: 'channel-1' }
      );
      expect(mockChannelRepository.update).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      const mockDMChannel2 = ChannelEntity.createDMChannel({
        channelId: 'channel-2',
        realmId: 'realm-1',
        agentId: 'agent-1',
        userId: 'user-2',
        name: 'DM with Test Agent',
        createdBy: { id: 'user-2', type: 'human' },
      });

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.mocked(mockChannelQueryService.getAllChannels).mockResolvedValue([
        mockDMChannel,
        mockDMChannel2,
      ]);
      vi.mocked(mockChannelRepository.findById).mockImplementation(async (channelId) => {
        if (channelId === 'channel-1') return mockDMChannel;
        if (channelId === 'channel-2') return mockDMChannel2;
        return null;
      });
      vi.mocked(mockChannelRepository.update).mockImplementation(async (channel) => {
        if (channel.channelId === 'channel-2') {
          throw new Error('Update failed');
        }
      });

      await handler.handle(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Some channels failed to update',
        expect.objectContaining({
          agentId: 'agent-1',
          succeeded: 1,
          failed: 1,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.updated',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: { agentId: 'agent-1', realmId: 'realm-1', changes: {} },
      };

      vi.mocked(mockAgentRepository.findById).mockRejectedValue(new Error('Database error'));

      await handler.handle(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AgentAvatarSyncHandler] Failed to sync avatar',
        expect.any(Error),
        { agentId: 'agent-1' }
      );
    });
  });
});
