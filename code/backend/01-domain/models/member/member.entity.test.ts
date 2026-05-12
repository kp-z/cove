import { describe, it, expect } from 'vitest';
import { MemberEntity } from './member.entity';

describe('MemberEntity', () => {
  const validProps = {
    memberId: 'member-001',
    channelId: 'channel-001',
    userId: 'user-001',
    userType: 'human' as const,
    role: 'owner' as const,
    permissions: ['read:message', 'write:message', 'manage:member', 'manage:channel'],
    status: 'active' as const,
    onlineStatus: 'online' as const,
    joinedAt: new Date('2026-04-01T00:00:00Z'),
    lastActiveAt: new Date('2026-05-07T01:00:00Z'),
    statistics: {
      messageCount: 1523,
      reactionCount: 245,
      mentionCount: 89,
      threadCount: 34,
    },
    notificationSettings: {
      enabled: true,
      mentionOnly: false,
    },
    meta: {
      tags: ['core-team', 'active'],
      invitedBy: {
        id: 'user-000',
        type: 'human' as const,
      },
      notes: '项目创始成员',
    },
  };

  describe('create', () => {
    it('should create a valid member entity', () => {
      const member = MemberEntity.create(validProps);
      expect(member.memberId).toBe('member-001');
      expect(member.role).toBe('owner');
      expect(member.status).toBe('active');
    });

    it('should throw error if memberId is empty', () => {
      expect(() =>
        MemberEntity.create({ ...validProps, memberId: '' })
      ).toThrow('Member ID cannot be empty');
    });
  });

  describe('role checks', () => {
    it('should correctly identify role', () => {
      const member = MemberEntity.create(validProps);
      expect(member.isOwner()).toBe(true);
      expect(member.isAdmin()).toBe(false);
      expect(member.hasAdminPrivileges()).toBe(true);
    });
  });

  describe('permission checks', () => {
    it('should check if member has permission', () => {
      const member = MemberEntity.create(validProps);
      expect(member.hasPermission('read:message')).toBe(true);
      expect(member.hasPermission('delete:channel')).toBe(false);
    });

    it('should add permission', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.addPermission('delete:message');
      expect(updated.hasPermission('delete:message')).toBe(true);
    });

    it('should remove permission', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.removePermission('manage:channel');
      expect(updated.hasPermission('manage:channel')).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('should activate member', () => {
      const member = MemberEntity.create({
        ...validProps,
        status: 'joined',
      });
      const updated = member.activate();
      expect(updated.status).toBe('active');
    });

    it('should leave channel', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.leave();
      expect(updated.status).toBe('left');
      expect(updated.leftAt).toBeDefined();
    });

    it('should ban member', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.ban();
      expect(updated.status).toBe('banned');
      expect(updated.bannedAt).toBeDefined();
    });
  });

  describe('online status', () => {
    it('should update online status', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.goOffline();
      expect(updated.onlineStatus).toBe('offline');
    });
  });

  describe('statistics', () => {
    it('should increment message count', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.incrementMessageCount();
      expect(updated.statistics.messageCount).toBe(1524);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const member = MemberEntity.create(validProps);
      const json = member.toJSON();
      expect(json.member_id).toBe('member-001');
      expect(json.role).toBe('owner');
    });

    it('should deserialize from JSON', () => {
      const member = MemberEntity.create(validProps);
      const json = member.toJSON();
      const deserialized = MemberEntity.fromJSON(json);
      expect(deserialized.memberId).toBe(member.memberId);
    });
  });

  describe('additional role checks', () => {
    it('should check if member is guest', () => {
      const member = MemberEntity.create({ ...validProps, role: 'guest' });
      expect(member.isGuest()).toBe(true);
      expect(member.isMember()).toBe(false);
    });

    it('should check if member is regular member', () => {
      const member = MemberEntity.create({ ...validProps, role: 'member' });
      expect(member.isMember()).toBe(true);
      expect(member.hasAdminPrivileges()).toBe(false);
    });
  });

  describe('status checks', () => {
    it('should check joined status', () => {
      const member = MemberEntity.create({ ...validProps, status: 'joined' });
      expect(member.isJoined()).toBe(true);
      expect(member.isActive()).toBe(false);
    });

    it('should check left status', () => {
      const member = MemberEntity.create({ ...validProps, status: 'left' });
      expect(member.hasLeft()).toBe(true);
    });

    it('should check banned status', () => {
      const member = MemberEntity.create({ ...validProps, status: 'banned' });
      expect(member.isBanned()).toBe(true);
    });

    it('should check online status', () => {
      const member = MemberEntity.create({ ...validProps, onlineStatus: 'online' });
      expect(member.isOnline()).toBe(true);
      expect(member.isOffline()).toBe(false);
    });

    it('should check away status', () => {
      const member = MemberEntity.create({ ...validProps, onlineStatus: 'away' });
      expect(member.isAway()).toBe(true);
    });
  });

  describe('type checks', () => {
    it('should check if member is human', () => {
      const member = MemberEntity.create({ ...validProps, userType: 'human' });
      expect(member.isHuman()).toBe(true);
      expect(member.isAgent()).toBe(false);
    });

    it('should check if member is agent', () => {
      const member = MemberEntity.create({ ...validProps, userType: 'agent' });
      expect(member.isAgent()).toBe(true);
      expect(member.isHuman()).toBe(false);
    });
  });

  describe('specific permission checks', () => {
    it('should check read messages permission', () => {
      const member = MemberEntity.create(validProps);
      expect(member.canReadMessages()).toBe(true);
    });

    it('should check write messages permission', () => {
      const member = MemberEntity.create(validProps);
      expect(member.canWriteMessages()).toBe(true);
    });

    it('should check manage members permission', () => {
      const member = MemberEntity.create(validProps);
      expect(member.canManageMembers()).toBe(true);
    });

    it('should check manage channel permission', () => {
      const member = MemberEntity.create(validProps);
      expect(member.canManageChannel()).toBe(true);
    });
  });

  describe('notification checks', () => {
    it('should check if member is muted', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: true,
          mentionOnly: false,
          muteUntil: futureDate,
        },
      });
      expect(member.isMuted()).toBe(true);
    });

    it('should check if mute has expired', () => {
      const pastDate = new Date(Date.now() - 3600000);
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: true,
          mentionOnly: false,
          muteUntil: pastDate,
        },
      });
      expect(member.isMuted()).toBe(false);
    });

    it('should not notify when notifications disabled', () => {
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: false,
          mentionOnly: false,
        },
      });
      expect(member.shouldNotify(false)).toBe(false);
      expect(member.shouldNotify(true)).toBe(false);
    });

    it('should not notify when muted', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: true,
          mentionOnly: false,
          muteUntil: futureDate,
        },
      });
      expect(member.shouldNotify(false)).toBe(false);
    });

    it('should only notify on mentions when mentionOnly is true', () => {
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: true,
          mentionOnly: true,
        },
      });
      expect(member.shouldNotify(false)).toBe(false);
      expect(member.shouldNotify(true)).toBe(true);
    });

    it('should notify on all messages when mentionOnly is false', () => {
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: true,
          mentionOnly: false,
        },
      });
      expect(member.shouldNotify(false)).toBe(true);
      expect(member.shouldNotify(true)).toBe(true);
    });
  });

  describe('immutable updates', () => {
    it('should update role', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.updateRole('admin');
      expect(updated.role).toBe('admin');
      expect(member.role).toBe('owner'); // Original unchanged
    });

    it('should update permissions', () => {
      const member = MemberEntity.create(validProps);
      const newPermissions = ['read:message', 'write:message'];
      const updated = member.updatePermissions(newPermissions);
      expect(updated.permissions).toEqual(newPermissions);
      expect(member.permissions).not.toEqual(newPermissions); // Original unchanged
    });
  });

  describe('statistics updates', () => {
    it('should increment reaction count', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.incrementReactionCount();
      expect(updated.statistics.reactionCount).toBe(246);
    });

    it('should increment mention count', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.incrementMentionCount();
      expect(updated.statistics.mentionCount).toBe(90);
    });

    it('should increment thread count', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.incrementThreadCount();
      expect(updated.statistics.threadCount).toBe(35);
    });
  });

  describe('online status updates', () => {
    it('should go online', () => {
      const member = MemberEntity.create({ ...validProps, onlineStatus: 'offline' });
      const updated = member.goOnline();
      expect(updated.onlineStatus).toBe('online');
    });

    it('should go away', () => {
      const member = MemberEntity.create(validProps);
      const updated = member.goAway();
      expect(updated.onlineStatus).toBe('away');
    });
  });

  describe('notification settings updates', () => {
    it('should mute notifications', () => {
      const member = MemberEntity.create(validProps);
      const until = new Date(Date.now() + 3600000);
      const updated = member.mute(until);
      expect(updated.notificationSettings.muteUntil).toEqual(until);
    });

    it('should unmute notifications', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: true,
          mentionOnly: false,
          muteUntil: futureDate,
        },
      });
      const updated = member.unmute();
      expect(updated.notificationSettings.muteUntil).toBeUndefined();
    });

    it('should update notification settings', () => {
      const member = MemberEntity.create({
        ...validProps,
        notificationSettings: {
          enabled: false,
          mentionOnly: false,
        },
      });
      const newSettings = {
        enabled: true,
        mentionOnly: true,
      };
      const updated = member.updateNotificationSettings(newSettings);
      expect(updated.notificationSettings.enabled).toBe(true);
      expect(updated.notificationSettings.mentionOnly).toBe(true);
    });
  });
});
