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
});
