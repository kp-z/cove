import { describe, it, expect } from 'vitest';
import {
  ServerMemberEntity,
  ServerRole,
  MemberStatus,
  ServerPermission,
  ROLE_PERMISSIONS,
} from '../server-member.entity';

describe('ServerMemberEntity', () => {
  const validProps = {
    member_id: 'member-123',
    server_id: 'server-456',
    user_id: 'user-789',
    role: 'member' as ServerRole,
    status: 'active' as MemberStatus,
    joined_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  describe('create', () => {
    it('should create a valid ServerMemberEntity', () => {
      const member = ServerMemberEntity.create(validProps);

      expect(member.memberId).toBe('member-123');
      expect(member.serverId).toBe('server-456');
      expect(member.userId).toBe('user-789');
      expect(member.role).toBe('member');
      expect(member.status).toBe('active');
      expect(member.joinedAt).toEqual(new Date('2024-01-01'));
      expect(member.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should create a member with custom permissions', () => {
      const member = ServerMemberEntity.create({
        ...validProps,
        custom_permissions: [ServerPermission.PROJECT_CREATE, ServerPermission.CHANNEL_CREATE],
      });

      expect(member.customPermissions).toEqual([
        ServerPermission.PROJECT_CREATE,
        ServerPermission.CHANNEL_CREATE,
      ]);
    });

    it('should create a member with meta', () => {
      const member = ServerMemberEntity.create({
        ...validProps,
        meta: { nickname: 'Alice' },
      });

      expect(member.meta).toEqual({ nickname: 'Alice' });
    });
  });

  describe('validation', () => {
    it('should throw error if member_id is empty', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, member_id: '' })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, member_id: '' })
      ).toThrow('Member ID is required');
    });

    it('should throw error if server_id is empty', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, server_id: '' })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, server_id: '' })
      ).toThrow('Server ID is required');
    });

    it('should throw error if user_id is empty', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, user_id: '' })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, user_id: '' })
      ).toThrow('User ID is required');
    });

    it('should throw error if role is invalid', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, role: 'invalid' as ServerRole })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, role: 'invalid' as ServerRole })
      ).toThrow('Invalid role: invalid');
    });

    it('should throw error if status is invalid', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, status: 'invalid' as MemberStatus })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, status: 'invalid' as MemberStatus })
      ).toThrow('Invalid status: invalid');
    });

    it('should throw error if joined_at is not a Date', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, joined_at: 'invalid' as any })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, joined_at: 'invalid' as any })
      ).toThrow('Joined at must be a Date');
    });

    it('should throw error if updated_at is not a Date', () => {
      expect(() =>
        ServerMemberEntity.create({ ...validProps, updated_at: 'invalid' as any })
      ).toThrow(Error);
      expect(() =>
        ServerMemberEntity.create({ ...validProps, updated_at: 'invalid' as any })
      ).toThrow('Updated at must be a Date');
    });
  });

  describe('getPermissions', () => {
    it('should return role default permissions when no custom permissions', () => {
      const member = ServerMemberEntity.create(validProps);
      const permissions = member.getPermissions();

      expect(permissions).toEqual(ROLE_PERMISSIONS.member);
    });

    it('should return custom permissions when set', () => {
      const customPermissions = [ServerPermission.PROJECT_CREATE, ServerPermission.CHANNEL_CREATE];
      const member = ServerMemberEntity.create({
        ...validProps,
        custom_permissions: customPermissions,
      });

      expect(member.getPermissions()).toEqual(customPermissions);
    });

    it('should return owner permissions for owner role', () => {
      const owner = ServerMemberEntity.create({ ...validProps, role: 'owner' });
      expect(owner.getPermissions()).toEqual(ROLE_PERMISSIONS.owner);
    });

    it('should return admin permissions for admin role', () => {
      const admin = ServerMemberEntity.create({ ...validProps, role: 'admin' });
      expect(admin.getPermissions()).toEqual(ROLE_PERMISSIONS.admin);
    });

    it('should return guest permissions for guest role', () => {
      const guest = ServerMemberEntity.create({ ...validProps, role: 'guest' });
      expect(guest.getPermissions()).toEqual(ROLE_PERMISSIONS.guest);
    });
  });

  describe('hasPermission', () => {
    it('should return true if member has the permission', () => {
      const member = ServerMemberEntity.create(validProps);
      expect(member.hasPermission(ServerPermission.MESSAGE_SEND)).toBe(true);
    });

    it('should return false if member does not have the permission', () => {
      const member = ServerMemberEntity.create(validProps);
      expect(member.hasPermission(ServerPermission.SERVER_DELETE)).toBe(false);
    });

    it('should check custom permissions', () => {
      const member = ServerMemberEntity.create({
        ...validProps,
        custom_permissions: [ServerPermission.PROJECT_CREATE],
      });

      expect(member.hasPermission(ServerPermission.PROJECT_CREATE)).toBe(true);
      expect(member.hasPermission(ServerPermission.MESSAGE_SEND)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if member has all permissions', () => {
      const member = ServerMemberEntity.create(validProps);
      expect(
        member.hasAllPermissions([ServerPermission.MESSAGE_SEND, ServerPermission.MESSAGE_VIEW])
      ).toBe(true);
    });

    it('should return false if member is missing any permission', () => {
      const member = ServerMemberEntity.create(validProps);
      expect(
        member.hasAllPermissions([
          ServerPermission.MESSAGE_SEND,
          ServerPermission.SERVER_DELETE,
        ])
      ).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if member has any of the permissions', () => {
      const member = ServerMemberEntity.create(validProps);
      expect(
        member.hasAnyPermission([ServerPermission.MESSAGE_SEND, ServerPermission.SERVER_DELETE])
      ).toBe(true);
    });

    it('should return false if member has none of the permissions', () => {
      const member = ServerMemberEntity.create(validProps);
      expect(
        member.hasAnyPermission([ServerPermission.SERVER_DELETE, ServerPermission.SERVER_TRANSFER])
      ).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true for owner role', () => {
      const owner = ServerMemberEntity.create({ ...validProps, role: 'owner' });
      expect(owner.isOwner()).toBe(true);
    });

    it('should return false for non-owner roles', () => {
      const admin = ServerMemberEntity.create({ ...validProps, role: 'admin' });
      const member = ServerMemberEntity.create({ ...validProps, role: 'member' });
      const guest = ServerMemberEntity.create({ ...validProps, role: 'guest' });

      expect(admin.isOwner()).toBe(false);
      expect(member.isOwner()).toBe(false);
      expect(guest.isOwner()).toBe(false);
    });
  });

  describe('isAdminOrHigher', () => {
    it('should return true for owner and admin roles', () => {
      const owner = ServerMemberEntity.create({ ...validProps, role: 'owner' });
      const admin = ServerMemberEntity.create({ ...validProps, role: 'admin' });

      expect(owner.isAdminOrHigher()).toBe(true);
      expect(admin.isAdminOrHigher()).toBe(true);
    });

    it('should return false for member and guest roles', () => {
      const member = ServerMemberEntity.create({ ...validProps, role: 'member' });
      const guest = ServerMemberEntity.create({ ...validProps, role: 'guest' });

      expect(member.isAdminOrHigher()).toBe(false);
      expect(guest.isAdminOrHigher()).toBe(false);
    });
  });

  describe('status checks', () => {
    it('should check if member is active', () => {
      const active = ServerMemberEntity.create({ ...validProps, status: 'active' });
      const suspended = ServerMemberEntity.create({ ...validProps, status: 'suspended' });

      expect(active.isActive()).toBe(true);
      expect(suspended.isActive()).toBe(false);
    });

    it('should check if member has left', () => {
      const left = ServerMemberEntity.create({ ...validProps, status: 'left' });
      const active = ServerMemberEntity.create({ ...validProps, status: 'active' });

      expect(left.hasLeft()).toBe(true);
      expect(active.hasLeft()).toBe(false);
    });

    it('should check if member is suspended', () => {
      const suspended = ServerMemberEntity.create({ ...validProps, status: 'suspended' });
      const active = ServerMemberEntity.create({ ...validProps, status: 'active' });

      expect(suspended.isSuspended()).toBe(true);
      expect(active.isSuspended()).toBe(false);
    });
  });

  describe('updateRole', () => {
    it('should update member role', () => {
      const member = ServerMemberEntity.create(validProps);
      const updated = member.updateRole('admin');

      expect(updated.role).toBe('admin');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(member.updatedAt.getTime());
    });

    it('should return new instance', () => {
      const member = ServerMemberEntity.create(validProps);
      const updated = member.updateRole('admin');

      expect(updated).not.toBe(member);
      expect(member.role).toBe('member');
    });
  });

  describe('setCustomPermissions', () => {
    it('should set custom permissions', () => {
      const member = ServerMemberEntity.create(validProps);
      const updated = member.setCustomPermissions([ServerPermission.PROJECT_CREATE]);

      expect(updated.customPermissions).toEqual([ServerPermission.PROJECT_CREATE]);
      expect(updated.getPermissions()).toEqual([ServerPermission.PROJECT_CREATE]);
    });

    it('should return new instance', () => {
      const member = ServerMemberEntity.create(validProps);
      const updated = member.setCustomPermissions([ServerPermission.PROJECT_CREATE]);

      expect(updated).not.toBe(member);
      expect(member.customPermissions).toBeUndefined();
    });
  });

  describe('clearCustomPermissions', () => {
    it('should clear custom permissions', () => {
      const member = ServerMemberEntity.create({
        ...validProps,
        custom_permissions: [ServerPermission.PROJECT_CREATE],
      });
      const updated = member.clearCustomPermissions();

      expect(updated.customPermissions).toBeUndefined();
      expect(updated.getPermissions()).toEqual(ROLE_PERMISSIONS.member);
    });
  });

  describe('suspend', () => {
    it('should suspend an active member', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'active' });
      const suspended = member.suspend();

      expect(suspended.status).toBe('suspended');
      expect(suspended.isSuspended()).toBe(true);
    });

    it('should throw error if already suspended', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'suspended' });

      expect(() => member.suspend()).toThrow(Error);
      expect(() => member.suspend()).toThrow('Member is already suspended');
    });

    it('should throw error if member has left', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'left' });

      expect(() => member.suspend()).toThrow(Error);
      expect(() => member.suspend()).toThrow('Cannot suspend a member who has left');
    });
  });

  describe('activate', () => {
    it('should activate a suspended member', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'suspended' });
      const activated = member.activate();

      expect(activated.status).toBe('active');
      expect(activated.isActive()).toBe(true);
    });

    it('should throw error if already active', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'active' });

      expect(() => member.activate()).toThrow(Error);
      expect(() => member.activate()).toThrow('Member is already active');
    });

    it('should throw error if member has left', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'left' });

      expect(() => member.activate()).toThrow(Error);
      expect(() => member.activate()).toThrow('Cannot activate a member who has left');
    });
  });

  describe('leave', () => {
    it('should allow member to leave', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'active' });
      const left = member.leave();

      expect(left.status).toBe('left');
      expect(left.hasLeft()).toBe(true);
    });

    it('should throw error if already left', () => {
      const member = ServerMemberEntity.create({ ...validProps, status: 'left' });

      expect(() => member.leave()).toThrow(Error);
      expect(() => member.leave()).toThrow('Member has already left');
    });

    it('should throw error if owner tries to leave', () => {
      const owner = ServerMemberEntity.create({ ...validProps, role: 'owner', status: 'active' });

      expect(() => owner.leave()).toThrow(Error);
      expect(() => owner.leave()).toThrow('Owner cannot leave the server. Transfer ownership first.');
    });
  });

  describe('updateMeta', () => {
    it('should update meta', () => {
      const member = ServerMemberEntity.create(validProps);
      const updated = member.updateMeta({ nickname: 'Alice' });

      expect(updated.meta).toEqual({ nickname: 'Alice' });
    });

    it('should merge with existing meta', () => {
      const member = ServerMemberEntity.create({
        ...validProps,
        meta: { nickname: 'Alice' },
      });
      const updated = member.updateMeta({ avatar: 'avatar.png' });

      expect(updated.meta).toEqual({ nickname: 'Alice', avatar: 'avatar.png' });
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize to JSON', () => {
      const member = ServerMemberEntity.create(validProps);
      const json = member.toJSON();

      expect(json).toEqual({
        member_id: 'member-123',
        server_id: 'server-456',
        user_id: 'user-789',
        role: 'member',
        custom_permissions: undefined,
        status: 'active',
        joined_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        meta: undefined,
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        member_id: 'member-123',
        server_id: 'server-456',
        user_id: 'user-789',
        role: 'member' as ServerRole,
        status: 'active' as MemberStatus,
        joined_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const member = ServerMemberEntity.fromJSON(json);

      expect(member.memberId).toBe('member-123');
      expect(member.serverId).toBe('server-456');
      expect(member.userId).toBe('user-789');
      expect(member.role).toBe('member');
      expect(member.status).toBe('active');
      expect(member.joinedAt).toEqual(new Date('2024-01-01'));
      expect(member.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should round-trip through JSON', () => {
      const original = ServerMemberEntity.create({
        ...validProps,
        custom_permissions: [ServerPermission.PROJECT_CREATE],
        meta: { nickname: 'Alice' },
      });

      const json = original.toJSON();
      const restored = ServerMemberEntity.fromJSON(json);

      expect(restored.memberId).toBe(original.memberId);
      expect(restored.serverId).toBe(original.serverId);
      expect(restored.userId).toBe(original.userId);
      expect(restored.role).toBe(original.role);
      expect(restored.customPermissions).toEqual(original.customPermissions);
      expect(restored.status).toBe(original.status);
      expect(restored.meta).toEqual(original.meta);
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should define owner permissions', () => {
      expect(ROLE_PERMISSIONS.owner).toContain(ServerPermission.SERVER_DELETE);
      expect(ROLE_PERMISSIONS.owner).toContain(ServerPermission.SERVER_TRANSFER);
      expect(ROLE_PERMISSIONS.owner).toContain(ServerPermission.MEMBER_MANAGE_ROLES);
    });

    it('should define admin permissions without server delete and transfer', () => {
      expect(ROLE_PERMISSIONS.admin).toContain(ServerPermission.SERVER_MANAGE);
      expect(ROLE_PERMISSIONS.admin).toContain(ServerPermission.MEMBER_MANAGE_ROLES);
      expect(ROLE_PERMISSIONS.admin).not.toContain(ServerPermission.SERVER_DELETE);
      expect(ROLE_PERMISSIONS.admin).not.toContain(ServerPermission.SERVER_TRANSFER);
    });

    it('should define member permissions as basic permissions', () => {
      expect(ROLE_PERMISSIONS.member).toContain(ServerPermission.MESSAGE_SEND);
      expect(ROLE_PERMISSIONS.member).toContain(ServerPermission.CHANNEL_CREATE);
      expect(ROLE_PERMISSIONS.member).not.toContain(ServerPermission.SERVER_MANAGE);
      expect(ROLE_PERMISSIONS.member).not.toContain(ServerPermission.MEMBER_REMOVE);
    });

    it('should define guest permissions as read-only', () => {
      expect(ROLE_PERMISSIONS.guest).toContain(ServerPermission.MESSAGE_VIEW);
      expect(ROLE_PERMISSIONS.guest).toContain(ServerPermission.CHANNEL_VIEW);
      expect(ROLE_PERMISSIONS.guest).not.toContain(ServerPermission.MESSAGE_SEND);
      expect(ROLE_PERMISSIONS.guest).not.toContain(ServerPermission.CHANNEL_CREATE);
    });
  });
});
