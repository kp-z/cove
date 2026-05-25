import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneralChannelAutoJoinService } from './general-channel-auto-join.service';
import { IEventBus, DomainEvent } from '../../interfaces/event-bus.interface';
import { IChannelRepository } from '../../interfaces/repositories/channel.repository.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';

describe('GeneralChannelAutoJoinService', () => {
  let service: GeneralChannelAutoJoinService;
  let mockEventBus: IEventBus;
  let mockChannelRepository: IChannelRepository;
  let mockLogger: ILogger;
  let eventHandlers: Map<string, (event: DomainEvent) => Promise<void>>;

  beforeEach(() => {
    eventHandlers = new Map();

    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn((eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
        eventHandlers.set(eventType, handler);
        return vi.fn(); // unsubscribe function
      }),
    };

    mockChannelRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    } as unknown as IChannelRepository;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new GeneralChannelAutoJoinService(mockEventBus, mockChannelRepository, mockLogger);
  });

  describe('start()', () => {
    it('should subscribe to user.created and agent.created events', () => {
      service.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledWith('user.created', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('agent.created', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Starting GeneralChannelAutoJoinService...');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'GeneralChannelAutoJoinService started successfully'
      );
    });
  });

  describe('stop()', () => {
    it('should unsubscribe from all events', () => {
      const unsubscribe1 = vi.fn();
      const unsubscribe2 = vi.fn();

      vi.mocked(mockEventBus.subscribe).mockReturnValueOnce(unsubscribe1).mockReturnValueOnce(unsubscribe2);

      service.start();
      service.stop();

      expect(unsubscribe1).toHaveBeenCalled();
      expect(unsubscribe2).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping GeneralChannelAutoJoinService...');
      expect(mockLogger.info).toHaveBeenCalledWith('GeneralChannelAutoJoinService stopped');
    });
  });

  describe('handleUserCreated', () => {
    beforeEach(() => {
      service.start();
    });

    it('should add user to general channel when user.created event is received', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
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
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      const updatedChannel = generalChannel.addMember({
        memberId: 'user-1',
        memberType: 'human',
        role: 'member',
        joinedAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);
      vi.mocked(mockChannelRepository.update).mockResolvedValue(updatedChannel);

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('user.created');
      await handler!(event);

      expect(mockChannelRepository.findAll).toHaveBeenCalled();
      expect(mockChannelRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
        }),
        'realm-1'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-joining user to general channel', {
        userId: 'user-1',
        realmId: 'realm-1',
      });
    });

    it('should use default realmId when not provided in event metadata', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
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
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: {},
      };

      const handler = eventHandlers.get('user.created');
      await handler!(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RealmId not found in event metadata, using default',
        expect.objectContaining({
          defaultRealmId: 'realm-nexus',
        })
      );
    });

    it('should skip if general channel not found', async () => {
      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([]);

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('user.created');
      await handler!(event);

      expect(mockChannelRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('General channel not found, skipping auto-join', {
        realmId: 'realm-1',
      });
    });

    it('should skip if user is already a member', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
        type: 'public',
        status: 'active',
        members: [
          {
            memberId: 'user-1',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('user.created');
      await handler!(event);

      expect(mockChannelRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Member already in general channel', {
        memberId: 'user-1',
      });
    });

    it('should not throw error if adding member fails', async () => {
      vi.mocked(mockChannelRepository.findAll).mockRejectedValue(new Error('Database error'));

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('user.created');
      await expect(handler!(event)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to auto-join user to general channel',
        expect.any(Error),
        { userId: 'user-1' }
      );
    });
  });

  describe('handleAgentCreated', () => {
    beforeEach(() => {
      service.start();
    });

    it('should add agent to general channel when agent.created event is received', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
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
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      const updatedChannel = generalChannel.addMember({
        memberId: 'agent-1',
        memberType: 'agent',
        role: 'member',
        joinedAt: new Date(),
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);
      vi.mocked(mockChannelRepository.update).mockResolvedValue(updatedChannel);

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.created',
        aggregateId: 'agent-1',
        aggregateType: 'Agent',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('agent.created');
      await handler!(event);

      expect(mockChannelRepository.findAll).toHaveBeenCalled();
      expect(mockChannelRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
        }),
        'realm-1'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-joining agent to general channel', {
        agentId: 'agent-1',
        realmId: 'realm-1',
      });
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      service.start();
    });

    it('should cache general channel and reuse it', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
        type: 'public',
        status: 'active',
        members: [
          {
            memberId: 'user-1',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);

      const event1: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const event2: DomainEvent = {
        eventId: 'event-2',
        eventType: 'user.created',
        aggregateId: 'user-1', // Same user, so it will skip (already member)
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('user.created');
      await handler!(event1);
      await handler!(event2);

      // First call queries database and skips (already member)
      // Second call uses cache and also skips (already member)
      // Since both skip adding, cache is not invalidated, so only 1 query
      expect(mockChannelRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Using cached general channel', {
        realmId: 'realm-1',
      });
    });

    it('should invalidate cache after adding member', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
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
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'user.created',
        aggregateId: 'user-1',
        aggregateType: 'User',
        occurredAt: new Date(),
        metadata: { realmId: 'realm-1' },
      };

      const handler = eventHandlers.get('user.created');
      await handler!(event);

      expect(mockLogger.debug).toHaveBeenCalledWith('Cache invalidated', { realmId: 'realm-1' });
    });
  });

  describe('addExistingMembersToGeneral', () => {
    it('should add multiple users and agents to general channel', async () => {
      const generalChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        displayName: 'General',
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
          maxMessageLength: 10000,
          maxMembers: 1000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/files',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin',
            type: 'human',
          },
        },
      });

      vi.mocked(mockChannelRepository.findAll).mockResolvedValue([generalChannel]);

      const result = await service.addExistingMembersToGeneral(
        'realm-1',
        ['user-1', 'user-2'],
        ['agent-1']
      );

      expect(result.added).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockChannelRepository.update).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockChannelRepository.findAll).mockRejectedValue(new Error('Database error'));

      const result = await service.addExistingMembersToGeneral('realm-1', ['user-1'], ['agent-1']);

      expect(result.added).toBe(0);
      expect(result.errors).toBe(2);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });
  });
});
