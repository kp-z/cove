/**
 * DM Channel Creation Tests
 *
 * Tests for the DM channel creation logic with domain-driven design approach.
 * Ensures that the refactored code maintains the same behavior as before.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelCrudService, CreateChannelDTO } from './channel-crud.service';
import { ChannelQueryService } from './channel-query.service';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { IChannelRepository } from '../../../domain/repositories/channel.repository.interface';
import { IEventPublisher } from '../../../domain/events/event-publisher.interface';
import { Logger } from '../../../infrastructure/logger/logger';
import { runWithContext, RealmContext } from '../../context/realm-context-store';

describe('DM Channel Creation (Domain-Driven Design)', () => {
  let channelCrudService: ChannelCrudService;
  let mockChannelRepository: IChannelRepository;
  let mockEventPublisher: IEventPublisher;
  let mockQueryService: ChannelQueryService;
  let mockLogger: Logger;
  let testContext: RealmContext;

  beforeEach(() => {
    testContext = {
      realmId: 'test-realm-001',
      userId: 'user-001',
      userType: 'human',
    };
    mockChannelRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn(),
    } as unknown as IChannelRepository;

    mockEventPublisher = {
      publish: vi.fn(),
    } as unknown as IEventPublisher;

    mockQueryService = {
      getAgentDMChannel: vi.fn(),
    } as unknown as ChannelQueryService;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    channelCrudService = new ChannelCrudService(
      mockChannelRepository,
      mockEventPublisher,
      mockLogger
    );
  });

  describe('createChannel - DM type', () => {
    it('should create DM channel with exactly 2 members (1 agent + 1 user)', async () => {
      const dto: CreateChannelDTO = {
        name: 'DM with Agent',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      const result = await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(result.type).toBe('dm');
      expect(result.members.length).toBe(2);
      expect(result.hasMember('agent-001')).toBe(true);
      expect(result.hasMember('user-001')).toBe(true);
      expect(result.agentPool).toEqual(['agent-001']);
    });

    it('should throw error if DM channel does not have exactly 2 members', async () => {
      const dto: CreateChannelDTO = {
        name: 'Invalid DM',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001', 'user-002', 'user-003'],
        agentIds: ['agent-001'],
      };

      await expect(
        runWithContext(testContext, async () => {
          return channelCrudService.createChannel(dto);
        })
      ).rejects.toThrow('DM channel must have exactly 2 members');
    });

    it('should throw error if DM channel does not have exactly 1 agent', async () => {
      const dto: CreateChannelDTO = {
        name: 'Invalid DM',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001', 'agent-002'],
      };

      // This will fail on member count first (3 members total: 1 user + 2 agents)
      await expect(
        runWithContext(testContext, async () => {
          return channelCrudService.createChannel(dto);
        })
      ).rejects.toThrow('DM channel must have exactly 2 members');
    });

    it('should throw error if DM channel has multiple agents with correct member count', async () => {
      const dto: CreateChannelDTO = {
        name: 'Invalid DM',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: [],
        agentIds: ['agent-001', 'agent-002'],
      };

      // This will fail on member count (2 agents, 0 users)
      await expect(
        runWithContext(testContext, async () => {
          return channelCrudService.createChannel(dto);
        })
      ).rejects.toThrow('DM channel must have exactly 1 agent');
    });

    it('should throw error if DM channel has no agents', async () => {
      const dto: CreateChannelDTO = {
        name: 'Invalid DM',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001', 'user-002'],
        agentIds: [],
      };

      await expect(
        runWithContext(testContext, async () => {
          return channelCrudService.createChannel(dto);
        })
      ).rejects.toThrow('DM channel must have exactly 1 agent');
    });

    it('should use ChannelEntity.createDMChannel factory method', async () => {
      const dto: CreateChannelDTO = {
        name: 'DM Channel',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      const result = await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      // Verify the channel was created using the domain factory
      expect(result.type).toBe('dm');
      expect(result.isDMWithAgent('agent-001')).toBe(true);
      expect(result.status).toBe('active');
      expect(result.communicationRules.allowMentions).toBe(true);
      expect(result.communicationRules.allowThreads).toBe(true);
    });

    it('should publish channel.created event after creating DM channel', async () => {
      const dto: CreateChannelDTO = {
        name: 'DM Channel',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'channel.created',
          aggregateType: 'Channel',
          payload: expect.objectContaining({
            type: 'dm',
          }),
        })
      );
    });

    it('should save DM channel to repository', async () => {
      const dto: CreateChannelDTO = {
        name: 'DM Channel',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(mockChannelRepository.save).toHaveBeenCalledWith(
        expect.any(ChannelEntity),
        expect.any(String)
      );
    });

    it('should use custom name if provided', async () => {
      const dto: CreateChannelDTO = {
        name: 'Custom DM Name',
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      const result = await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(result.name).toBe('Custom DM Name');
    });

    it('should use default name if not provided', async () => {
      const dto: CreateChannelDTO = {
        type: 'dm',
        createdBy: 'user-001',
        memberIds: ['user-001'],
        agentIds: ['agent-001'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      const result = await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(result.name).toBe('DM-agent-001');
    });
  });

  describe('createChannel - Regular channels', () => {
    it('should create public channel without DM restrictions', async () => {
      const dto: CreateChannelDTO = {
        name: 'General',
        type: 'public',
        createdBy: 'user-001',
        memberIds: ['user-001', 'user-002', 'user-003'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      const result = await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(result.type).toBe('public');
      expect(result.members.length).toBe(3);
    });

    it('should create private channel without DM restrictions', async () => {
      const dto: CreateChannelDTO = {
        name: 'Private Team',
        type: 'private',
        createdBy: 'user-001',
        memberIds: ['user-001', 'user-002'],
      };

      vi.mocked(mockChannelRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventPublisher.publish).mockResolvedValue(undefined);

      const result = await runWithContext(testContext, async () => {
        return channelCrudService.createChannel(dto);
      });

      expect(result.type).toBe('private');
      expect(result.members.length).toBe(2);
    });
  });
});
