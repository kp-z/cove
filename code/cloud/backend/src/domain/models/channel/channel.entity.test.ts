import { describe, it, expect } from 'vitest';
import { ChannelEntity } from './channel.entity';

describe('ChannelEntity', () => {
  const validProps = {
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
  });

  describe('type checks', () => {
    it('should correctly identify public channel', () => {
      const channel = ChannelEntity.create(validProps);
      expect(channel.isPublic()).toBe(true);
      expect(channel.isPrivate()).toBe(false);
      expect(channel.isDM()).toBe(false);
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

  describe('createDMChannel', () => {
    it('should create a valid DM channel with agent and user', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-001',
        agentId: 'agent-001',
        userId: 'user-001',
        createdBy: { id: 'user-001', type: 'human' },
        name: 'DM with Agent',
        description: 'Direct message channel',
      });

      expect(dmChannel.channelId).toBe('dm-001');
      expect(dmChannel.type).toBe('dm');
      expect(dmChannel.members.length).toBe(2);
      expect(dmChannel.agentPool).toEqual(['agent-001']);
      expect(dmChannel.hasMember('agent-001')).toBe(true);
      expect(dmChannel.hasMember('user-001')).toBe(true);
    });

    it('should create DM channel with default name if not provided', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-002',
        agentId: 'agent-002',
        userId: 'user-002',
        createdBy: { id: 'user-002', type: 'human' },
      });

      expect(dmChannel.name).toBe('DM-agent-002');
      expect(dmChannel.displayName).toBe('DM with Agent agent-002');
    });

    it('should create DM channel with correct member types', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-003',
        agentId: 'agent-003',
        userId: 'user-003',
        createdBy: { id: 'user-003', type: 'human' },
      });

      const agentMember = dmChannel.getMember('agent-003');
      const userMember = dmChannel.getMember('user-003');

      expect(agentMember?.memberType).toBe('agent');
      expect(userMember?.memberType).toBe('human');
    });

    it('should set creator as owner when user creates DM channel', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-004',
        agentId: 'agent-004',
        userId: 'user-004',
        createdBy: { id: 'user-004', type: 'human' },
      });

      const agentMember = dmChannel.getMember('agent-004');
      const userMember = dmChannel.getMember('user-004');

      expect(userMember?.role).toBe('owner');
      expect(agentMember?.role).toBe('member');
    });

    it('should set creator as owner when agent creates DM channel', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-005',
        agentId: 'agent-005',
        userId: 'user-005',
        createdBy: { id: 'agent-005', type: 'agent' },
      });

      const agentMember = dmChannel.getMember('agent-005');
      const userMember = dmChannel.getMember('user-005');

      expect(agentMember?.role).toBe('owner');
      expect(userMember?.role).toBe('member');
    });

    it('should create DM channel with correct communication rules', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-004',
        agentId: 'agent-004',
        userId: 'user-004',
        createdBy: { id: 'user-004', type: 'human' },
      });

      expect(dmChannel.communicationRules.allowMentions).toBe(true);
      expect(dmChannel.communicationRules.allowThreads).toBe(true);
      expect(dmChannel.communicationRules.allowAttachments).toBe(true);
      expect(dmChannel.communicationRules.maxMessageLength).toBe(10000);
    });

    it('should create DM channel with active status', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-005',
        agentId: 'agent-005',
        userId: 'user-005',
        createdBy: { id: 'user-005', type: 'human' },
      });

      expect(dmChannel.status).toBe('active');
    });
  });

  describe('isDMWithAgent', () => {
    it('should return true for DM channel with specified agent', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-006',
        agentId: 'agent-006',
        userId: 'user-006',
        createdBy: { id: 'user-006', type: 'human' },
      });

      expect(dmChannel.isDMWithAgent('agent-006')).toBe(true);
    });

    it('should return false for DM channel with different agent', () => {
      const dmChannel = ChannelEntity.createDMChannel({
        channelId: 'dm-007',
        agentId: 'agent-007',
        userId: 'user-007',
        createdBy: { id: 'user-007', type: 'human' },
      });

      expect(dmChannel.isDMWithAgent('agent-999')).toBe(false);
    });

    it('should return false for non-DM channel', () => {
      const channel = ChannelEntity.create(validProps);
      expect(channel.isDMWithAgent('agent-001')).toBe(false);
    });

    it('should return false for DM channel with multiple agents', () => {
      const channel = ChannelEntity.create({
        ...validProps,
        type: 'dm',
        members: [
          {
            memberId: 'agent-001',
            memberType: 'agent',
            role: 'member',
            joinedAt: new Date(),
          },
          {
            memberId: 'user-001',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
        agentPool: ['agent-001', 'agent-002'],
      });

      expect(channel.isDMWithAgent('agent-001')).toBe(false);
    });
  });

  describe('Permission System', () => {
    const createChannelWithRoles = () => {
      return ChannelEntity.create({
        ...validProps,
        members: [
          {
            memberId: 'owner-001',
            memberType: 'human' as const,
            role: 'owner' as const,
            joinedAt: new Date(),
          },
          {
            memberId: 'admin-001',
            memberType: 'human' as const,
            role: 'admin' as const,
            joinedAt: new Date(),
          },
          {
            memberId: 'member-001',
            memberType: 'human' as const,
            role: 'member' as const,
            joinedAt: new Date(),
          },
        ],
      });
    };

    describe('canAddMember', () => {
      it('should allow owner to add member', () => {
        const channel = createChannelWithRoles();
        expect(channel.canAddMember('owner-001')).toBe(true);
      });

      it('should allow admin to add member', () => {
        const channel = createChannelWithRoles();
        expect(channel.canAddMember('admin-001')).toBe(true);
      });

      it('should not allow regular member to add member', () => {
        const channel = createChannelWithRoles();
        expect(channel.canAddMember('member-001')).toBe(false);
      });

      it('should not allow adding member to DM channel', () => {
        const dmChannel = ChannelEntity.createDMChannel({
          channelId: 'dm-001',
          agentId: 'agent-001',
          userId: 'user-001',
          createdBy: { id: 'user-001', type: 'human' },
        });
        expect(dmChannel.canAddMember('user-001')).toBe(false);
      });
    });

    describe('canRemoveMember', () => {
      it('should allow owner to remove any member', () => {
        const channel = createChannelWithRoles();
        expect(channel.canRemoveMember('owner-001', 'admin-001')).toBe(true);
        expect(channel.canRemoveMember('owner-001', 'member-001')).toBe(true);
      });

      it('should allow admin to remove regular member', () => {
        const channel = createChannelWithRoles();
        expect(channel.canRemoveMember('admin-001', 'member-001')).toBe(true);
      });

      it('should not allow admin to remove owner', () => {
        const channel = createChannelWithRoles();
        expect(channel.canRemoveMember('admin-001', 'owner-001')).toBe(false);
      });

      it('should not allow regular member to remove anyone', () => {
        const channel = createChannelWithRoles();
        expect(channel.canRemoveMember('member-001', 'admin-001')).toBe(false);
      });

      it('should not allow removing member from DM channel', () => {
        const dmChannel = ChannelEntity.createDMChannel({
          channelId: 'dm-001',
          agentId: 'agent-001',
          userId: 'user-001',
          createdBy: { id: 'user-001', type: 'human' },
        });
        expect(dmChannel.canRemoveMember('user-001', 'agent-001')).toBe(false);
      });
    });

    describe('canUpdateRole', () => {
      it('should allow owner to update role', () => {
        const channel = createChannelWithRoles();
        expect(channel.canUpdateRole('owner-001', 'admin-001')).toBe(true);
      });

      it('should not allow admin to update role', () => {
        const channel = createChannelWithRoles();
        expect(channel.canUpdateRole('admin-001', 'member-001')).toBe(false);
      });

      it('should not allow owner to update their own role', () => {
        const channel = createChannelWithRoles();
        expect(channel.canUpdateRole('owner-001', 'owner-001')).toBe(false);
      });
    });

    describe('canDeleteChannel', () => {
      it('should allow owner to delete channel', () => {
        const channel = createChannelWithRoles();
        expect(channel.canDeleteChannel('owner-001')).toBe(true);
      });

      it('should not allow admin to delete channel', () => {
        const channel = createChannelWithRoles();
        expect(channel.canDeleteChannel('admin-001')).toBe(false);
      });

      it('should not allow deleting DM channel', () => {
        const dmChannel = ChannelEntity.createDMChannel({
          channelId: 'dm-001',
          agentId: 'agent-001',
          userId: 'user-001',
          createdBy: { id: 'user-001', type: 'human' },
        });
        expect(dmChannel.canDeleteChannel('user-001')).toBe(false);
      });
    });

    describe('addMemberWithPermission', () => {
      it('should add member when operator has permission', () => {
        const channel = createChannelWithRoles();
        const newMember = {
          memberId: 'new-member',
          memberType: 'human' as const,
          role: 'member' as const,
          joinedAt: new Date(),
        };
        const updated = channel.addMemberWithPermission('owner-001', newMember);
        expect(updated.hasMember('new-member')).toBe(true);
      });

      it('should throw error when operator has no permission', () => {
        const channel = createChannelWithRoles();
        const newMember = {
          memberId: 'new-member',
          memberType: 'human' as const,
          role: 'member' as const,
          joinedAt: new Date(),
        };
        expect(() =>
          channel.addMemberWithPermission('member-001', newMember)
        ).toThrow('Permission denied: cannot add member');
      });
    });

    describe('removeMemberWithPermission', () => {
      it('should remove member when operator has permission', () => {
        const channel = createChannelWithRoles();
        const updated = channel.removeMemberWithPermission('owner-001', 'member-001');
        expect(updated.hasMember('member-001')).toBe(false);
      });

      it('should throw error when operator has no permission', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.removeMemberWithPermission('member-001', 'admin-001')
        ).toThrow('Permission denied: cannot remove member');
      });

      it('should throw error when removing last owner', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.removeMemberWithPermission('owner-001', 'owner-001')
        ).toThrow('Cannot remove the last owner');
      });
    });

    describe('updateMemberRoleWithPermission', () => {
      it('should update role when operator has permission', () => {
        const channel = createChannelWithRoles();
        const updated = channel.updateMemberRoleWithPermission('owner-001', 'member-001', 'admin');
        expect(updated.getMemberRole('member-001')).toBe('admin');
      });

      it('should throw error when operator has no permission', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.updateMemberRoleWithPermission('admin-001', 'member-001', 'admin')
        ).toThrow('Permission denied: cannot update role');
      });

      it('should throw error when demoting last owner', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.updateMemberRoleWithPermission('owner-001', 'owner-001', 'admin')
        ).toThrow('Permission denied: cannot update role');
      });
    });

    describe('transferOwnership', () => {
      it('should transfer ownership successfully', () => {
        const channel = createChannelWithRoles();
        const updated = channel.transferOwnership('owner-001', 'admin-001');
        expect(updated.isOwner('admin-001')).toBe(true);
        expect(updated.isAdmin('owner-001')).toBe(true);
      });

      it('should throw error when operator is not owner', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.transferOwnership('admin-001', 'member-001')
        ).toThrow('Only owner can transfer ownership');
      });

      it('should throw error when new owner is not a member', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.transferOwnership('owner-001', 'non-member')
        ).toThrow('New owner must be a member');
      });
    });

    describe('promoteToOwner', () => {
      it('should promote member to owner', () => {
        const channel = createChannelWithRoles();
        const updated = channel.promoteToOwner('owner-001', 'admin-001');
        expect(updated.isOwner('admin-001')).toBe(true);
        expect(updated.getOwnerCount()).toBe(2);
      });

      it('should throw error when operator is not owner', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.promoteToOwner('admin-001', 'member-001')
        ).toThrow('Only owner can promote to owner');
      });
    });

    describe('demoteSelf', () => {
      it('should allow owner to demote themselves when multiple owners exist', () => {
        const channel = ChannelEntity.create({
          ...validProps,
          members: [
            {
              memberId: 'owner-001',
              memberType: 'human' as const,
              role: 'owner' as const,
              joinedAt: new Date(),
            },
            {
              memberId: 'owner-002',
              memberType: 'human' as const,
              role: 'owner' as const,
              joinedAt: new Date(),
            },
          ],
        });
        const updated = channel.demoteSelf('owner-001');
        expect(updated.isAdmin('owner-001')).toBe(true);
        expect(updated.getOwnerCount()).toBe(1);
      });

      it('should throw error when demoting last owner', () => {
        const channel = createChannelWithRoles();
        expect(() =>
          channel.demoteSelf('owner-001')
        ).toThrow('Cannot demote the last owner');
      });
    });

    describe('Helper methods', () => {
      it('should get owner count', () => {
        const channel = createChannelWithRoles();
        expect(channel.getOwnerCount()).toBe(1);
      });

      it('should get all owners', () => {
        const channel = createChannelWithRoles();
        const owners = channel.getOwners();
        expect(owners.length).toBe(1);
        expect(owners[0].memberId).toBe('owner-001');
      });

      it('should get all admins', () => {
        const channel = createChannelWithRoles();
        const admins = channel.getAdmins();
        expect(admins.length).toBe(1);
        expect(admins[0].memberId).toBe('admin-001');
      });

      it('should get all regular members', () => {
        const channel = createChannelWithRoles();
        const members = channel.getMembers();
        expect(members.length).toBe(1);
        expect(members[0].memberId).toBe('member-001');
      });
    });
  });
});
