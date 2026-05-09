import { describe, it, expect } from 'vitest';
import { ChannelEntity } from './channel.entity';

describe('ChannelEntity', () => {
  const validProps = {
    channelId: 'channel-001',
    name: '#general',
    displayName: '通用讨论',
    description: '团队通用讨论频道',
    type: 'public' as const,
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

  describe('create', () => {
    it('should create a valid channel entity', () => {
      const channel = ChannelEntity.create(validProps);

      expect(channel.channelId).toBe('channel-001');
      expect(channel.name).toBe('#general');
      expect(channel.type).toBe('public');
    });

    it('should throw error if channelId is empty', () => {
      expect(() =>
        ChannelEntity.create({ ...validProps, channelId: '' })
      ).toThrow('Channel ID cannot be empty');
    });

    it('should throw error if name is empty', () => {
      expect(() =>
        ChannelEntity.create({ ...validProps, name: '' })
      ).toThrow('Channel name cannot be empty');
    });

    it('should throw error if type is invalid', () => {
      expect(() =>
        ChannelEntity.create({ ...validProps, type: 'invalid' as any })
      ).toThrow('Invalid channel type');
    });

    it('should throw error if DM channel does not have exactly 2 members', () => {
      expect(() =>
        ChannelEntity.create({
          ...validProps,
          type: 'dm',
          members: [validProps.members[0]],
        })
      ).toThrow('DM channels must have exactly 2 members');
    });

    it('should throw error if thread channel has no parent', () => {
      expect(() =>
        ChannelEntity.create({
          ...validProps,
          type: 'thread',
          parentChannelId: undefined,
        })
      ).toThrow('Thread channels must have a parent channel');
    });
  });

  describe('type checks', () => {
    it('should correctly identify public channel', () => {
      const channel = ChannelEntity.create(validProps);
      expect(channel.isPublic()).toBe(true);
      expect(channel.isPrivate()).toBe(false);
      expect(channel.isDM()).toBe(false);
      expect(channel.isThread()).toBe(false);
    });
  });

  describe('member operations', () => {
    it('should check if member exists', () => {
      const channel = ChannelEntity.create(validProps);
      expect(channel.hasMember('user-001')).toBe(true);
      expect(channel.hasMember('user-999')).toBe(false);
    });

    it('should get member by id', () => {
      const channel = ChannelEntity.create(validProps);
      const member = channel.getMember('user-001');
      expect(member).toBeDefined();
      expect(member?.role).toBe('owner');
    });

    it('should add new member', () => {
      const channel = ChannelEntity.create(validProps);
      const newMember = {
        memberId: 'user-002',
        memberType: 'human' as const,
        role: 'member' as const,
        joinedAt: new Date(),
      };

      const updated = channel.addMember(newMember);
      expect(updated.members.length).toBe(2);
      expect(updated.hasMember('user-002')).toBe(true);
    });

    it('should throw error when adding duplicate member', () => {
      const channel = ChannelEntity.create(validProps);
      expect(() =>
        channel.addMember(validProps.members[0])
      ).toThrow('Member user-001 already exists in channel');
    });

    it('should remove member', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.removeMember('user-001');
      expect(updated.members.length).toBe(0);
      expect(updated.hasMember('user-001')).toBe(false);
    });

    it('should update member role', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.updateMemberRole('user-001', 'admin');
      expect(updated.getMemberRole('user-001')).toBe('admin');
    });
  });

  describe('agent pool operations', () => {
    it('should add agent to pool', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.addAgent('agent-002');
      expect(updated.agentPool.length).toBe(2);
      expect(updated.hasAgent('agent-002')).toBe(true);
    });

    it('should remove agent from pool', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.removeAgent('agent-001');
      expect(updated.agentPool.length).toBe(0);
      expect(updated.hasAgent('agent-001')).toBe(false);
    });
  });

  describe('task pool operations', () => {
    it('should add task to pool', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.addTask('task-002');
      expect(updated.taskPool.length).toBe(2);
      expect(updated.hasTask('task-002')).toBe(true);
    });

    it('should remove task from pool', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.removeTask('task-001');
      expect(updated.taskPool.length).toBe(0);
      expect(updated.hasTask('task-001')).toBe(false);
    });
  });

  describe('message count', () => {
    it('should increment message count', () => {
      const channel = ChannelEntity.create(validProps);
      const updated = channel.incrementMessageCount();
      expect(updated.meta.messageCount).toBe(1);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const channel = ChannelEntity.create(validProps);
      const json = channel.toJSON();

      expect(json.channel_id).toBe('channel-001');
      expect(json.name).toBe('#general');
      expect(json.type).toBe('public');
    });

    it('should deserialize from JSON', () => {
      const channel = ChannelEntity.create(validProps);
      const json = channel.toJSON();
      const deserialized = ChannelEntity.fromJSON(json);

      expect(deserialized.channelId).toBe(channel.channelId);
      expect(deserialized.name).toBe(channel.name);
      expect(deserialized.type).toBe(channel.type);
    });
  });

  describe('equality', () => {
    it('should be equal if channelId matches', () => {
      const channel1 = ChannelEntity.create(validProps);
      const channel2 = ChannelEntity.create(validProps);
      expect(channel1.equals(channel2)).toBe(true);
    });

    it('should not be equal if channelId differs', () => {
      const channel1 = ChannelEntity.create(validProps);
      const channel2 = ChannelEntity.create({
        ...validProps,
        channelId: 'channel-002',
      });
      expect(channel1.equals(channel2)).toBe(false);
    });
  });
});
