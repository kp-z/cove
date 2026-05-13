import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryChannelRepository } from './in-memory-channel.repository';
import { ChannelEntity } from '../../01-domain/models/channel/channel.entity';

describe('InMemoryChannelRepository', () => {
  let repository: InMemoryChannelRepository;

  // Test data factory
  const createTestChannel = (overrides: Partial<any> = {}) => {
    const defaults = {
      channelId: 'channel-001',
      name: '#general',
      displayName: '通用讨论',
      description: '团队通用讨论频道',
      type: 'public' as const,
      status: 'active' as const,
      projectId: 'proj-001',
      members: [
        {
          memberId: 'user-001',
          memberType: 'human' as const,
          role: 'owner' as const,
          joinedAt: new Date('2026-04-01T00:00:00Z'),
        },
      ],
      agentPool: ['agent-001'],
      taskPool: ['task-001'],
      conversationPool: [],
      communicationRules: {
        allowMentions: true,
        allowThreads: true,
        allowAttachments: true,
        maxMessageLength: 10000,
      },
      workspace: {
        root: 'channels/channel-001/workspace/',
        sharedFiles: 'channels/channel-001/workspace/shared/',
        attachments: 'channels/channel-001/workspace/attachments/',
      },
      meta: {
        tags: ['general', 'team'],
        category: 'communication',
        messageCount: 0,
        createdAt: new Date('2026-04-01T00:00:00Z'),
        updatedAt: new Date('2026-04-01T00:00:00Z'),
        createdBy: {
          id: 'user-001',
          type: 'human' as const,
        },
      },
    };

    return ChannelEntity.create({ ...defaults, ...overrides });
  };

  beforeEach(() => {
    repository = new InMemoryChannelRepository();
  });

  describe('save', () => {
    it('should save a new channel', async () => {
      const channel = createTestChannel();

      await repository.save(channel);

      const found = await repository.findById(channel.channelId);
      expect(found).toBeDefined();
      expect(found?.channelId).toBe(channel.channelId);
      expect(found?.name).toBe(channel.name);
    });

    it('should throw error when saving duplicate channel', async () => {
      const channel = createTestChannel();

      await repository.save(channel);

      await expect(repository.save(channel)).rejects.toThrow(
        'Channel with ID channel-001 already exists'
      );
    });

    it('should increment count after save', async () => {
      const channel = createTestChannel();

      expect(repository.count()).toBe(0);
      await repository.save(channel);
      expect(repository.count()).toBe(1);
    });
  });

  describe('findById', () => {
    it('should find channel by id', async () => {
      const channel = createTestChannel();
      await repository.save(channel);

      const found = await repository.findById('channel-001');

      expect(found).toBeDefined();
      expect(found?.channelId).toBe('channel-001');
    });

    it('should return null for non-existent channel', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByProject', () => {
    it('should find channels by project id', async () => {
      const channel1 = createTestChannel({ channelId: 'ch-1', projectId: 'proj-001' });
      const channel2 = createTestChannel({ channelId: 'ch-2', projectId: 'proj-001' });
      const channel3 = createTestChannel({ channelId: 'ch-3', projectId: 'proj-002' });

      await repository.save(channel1);
      await repository.save(channel2);
      await repository.save(channel3);

      const found = await repository.findByProject('proj-001');

      expect(found).toHaveLength(2);
      expect(found.map(c => c.channelId)).toContain('ch-1');
      expect(found.map(c => c.channelId)).toContain('ch-2');
      expect(found.map(c => c.channelId)).not.toContain('ch-3');
    });

    it('should return empty array for project with no channels', async () => {
      const found = await repository.findByProject('non-existent');

      expect(found).toEqual([]);
    });

    it('should sort results by name', async () => {
      const channel1 = createTestChannel({ channelId: 'ch-1', name: '#zebra', projectId: 'proj-001' });
      const channel2 = createTestChannel({ channelId: 'ch-2', name: '#alpha', projectId: 'proj-001' });
      const channel3 = createTestChannel({ channelId: 'ch-3', name: '#beta', projectId: 'proj-001' });

      await repository.save(channel1);
      await repository.save(channel2);
      await repository.save(channel3);

      const found = await repository.findByProject('proj-001');

      expect(found[0].name).toBe('#alpha');
      expect(found[1].name).toBe('#beta');
      expect(found[2].name).toBe('#zebra');
    });
  });

  describe('findByType', () => {
    it('should find channels by type', async () => {
      const publicChannel = createTestChannel({ channelId: 'ch-1', type: 'public' });
      const privateChannel = createTestChannel({ channelId: 'ch-2', type: 'private' });
      const dmChannel = createTestChannel({
        channelId: 'ch-3',
        type: 'dm',
        members: [
          {
            memberId: 'user-001',
            memberType: 'human' as const,
            role: 'member' as const,
            joinedAt: new Date(),
          },
          {
            memberId: 'user-002',
            memberType: 'human' as const,
            role: 'member' as const,
            joinedAt: new Date(),
          },
        ],
      });

      await repository.save(publicChannel);
      await repository.save(privateChannel);
      await repository.save(dmChannel);

      const publicChannels = await repository.findByType('public');
      const privateChannels = await repository.findByType('private');
      const dmChannels = await repository.findByType('dm');

      expect(publicChannels).toHaveLength(1);
      expect(publicChannels[0].channelId).toBe('ch-1');

      expect(privateChannels).toHaveLength(1);
      expect(privateChannels[0].channelId).toBe('ch-2');

      expect(dmChannels).toHaveLength(1);
      expect(dmChannels[0].channelId).toBe('ch-3');
    });

    it('should return empty array for type with no channels', async () => {
      const found = await repository.findByType('thread');

      expect(found).toEqual([]);
    });
  });

  describe('findByMember', () => {
    it('should find channels by member id', async () => {
      const channel1 = createTestChannel({
        channelId: 'ch-1',
        members: [
          {
            memberId: 'user-001',
            memberType: 'human' as const,
            role: 'owner' as const,
            joinedAt: new Date(),
          },
        ],
      });

      const channel2 = createTestChannel({
        channelId: 'ch-2',
        members: [
          {
            memberId: 'user-001',
            memberType: 'human' as const,
            role: 'member' as const,
            joinedAt: new Date(),
          },
          {
            memberId: 'user-002',
            memberType: 'human' as const,
            role: 'member' as const,
            joinedAt: new Date(),
          },
        ],
      });

      const channel3 = createTestChannel({
        channelId: 'ch-3',
        members: [
          {
            memberId: 'user-002',
            memberType: 'human' as const,
            role: 'owner' as const,
            joinedAt: new Date(),
          },
        ],
      });

      await repository.save(channel1);
      await repository.save(channel2);
      await repository.save(channel3);

      const user1Channels = await repository.findByMember('user-001');
      const user2Channels = await repository.findByMember('user-002');

      expect(user1Channels).toHaveLength(2);
      expect(user1Channels.map(c => c.channelId)).toContain('ch-1');
      expect(user1Channels.map(c => c.channelId)).toContain('ch-2');

      expect(user2Channels).toHaveLength(2);
      expect(user2Channels.map(c => c.channelId)).toContain('ch-2');
      expect(user2Channels.map(c => c.channelId)).toContain('ch-3');
    });

    it('should return empty array for member with no channels', async () => {
      const found = await repository.findByMember('non-existent');

      expect(found).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should find all channels', async () => {
      const channel1 = createTestChannel({ channelId: 'ch-1' });
      const channel2 = createTestChannel({ channelId: 'ch-2' });
      const channel3 = createTestChannel({ channelId: 'ch-3' });

      await repository.save(channel1);
      await repository.save(channel2);
      await repository.save(channel3);

      const found = await repository.findAll();

      expect(found).toHaveLength(3);
    });

    it('should return empty array when no channels exist', async () => {
      const found = await repository.findAll();

      expect(found).toEqual([]);
    });

    it('should sort results by name', async () => {
      const channel1 = createTestChannel({ channelId: 'ch-1', name: '#zebra' });
      const channel2 = createTestChannel({ channelId: 'ch-2', name: '#alpha' });

      await repository.save(channel1);
      await repository.save(channel2);

      const found = await repository.findAll();

      expect(found[0].name).toBe('#alpha');
      expect(found[1].name).toBe('#zebra');
    });
  });

  describe('update', () => {
    it('should update existing channel', async () => {
      const channel = createTestChannel();
      await repository.save(channel);

      const updated = channel.addMember({
        memberId: 'user-002',
        memberType: 'human' as const,
        role: 'member' as const,
        joinedAt: new Date(),
      });

      await repository.update(updated);

      const found = await repository.findById(channel.channelId);
      expect(found?.members).toHaveLength(2);
    });

    it('should throw error when updating non-existent channel', async () => {
      const channel = createTestChannel();

      await expect(repository.update(channel)).rejects.toThrow(
        'Channel with ID channel-001 not found'
      );
    });

    it('should not change count after update', async () => {
      const channel = createTestChannel();
      await repository.save(channel);

      expect(repository.count()).toBe(1);

      const updated = channel.addMember({
        memberId: 'user-002',
        memberType: 'human' as const,
        role: 'member' as const,
        joinedAt: new Date(),
      });
      await repository.update(updated);

      expect(repository.count()).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete existing channel', async () => {
      const channel = createTestChannel();
      await repository.save(channel);

      await repository.delete(channel.channelId);

      const found = await repository.findById(channel.channelId);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent channel', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(
        'Channel with ID non-existent not found'
      );
    });

    it('should decrement count after delete', async () => {
      const channel = createTestChannel();
      await repository.save(channel);

      expect(repository.count()).toBe(1);
      await repository.delete(channel.channelId);
      expect(repository.count()).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing channel', async () => {
      const channel = createTestChannel();
      await repository.save(channel);

      const exists = await repository.exists(channel.channelId);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent channel', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all channels', async () => {
      const channel1 = createTestChannel({ channelId: 'ch-1' });
      const channel2 = createTestChannel({ channelId: 'ch-2' });

      await repository.save(channel1);
      await repository.save(channel2);

      expect(repository.count()).toBe(2);

      repository.clear();

      expect(repository.count()).toBe(0);
      const found = await repository.findAll();
      expect(found).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return correct count', async () => {
      expect(repository.count()).toBe(0);

      const channel1 = createTestChannel({ channelId: 'ch-1' });
      await repository.save(channel1);
      expect(repository.count()).toBe(1);

      const channel2 = createTestChannel({ channelId: 'ch-2' });
      await repository.save(channel2);
      expect(repository.count()).toBe(2);

      await repository.delete('ch-1');
      expect(repository.count()).toBe(1);
    });
  });
});
