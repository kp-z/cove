import { describe, it, expect, beforeEach } from 'vitest';
import {
  PermissionEvaluationService,
  Role,
  Subject,
} from './permission-evaluation.service';

describe('PermissionEvaluationService', () => {
  let service: PermissionEvaluationService;
  let roles: Role[];

  beforeEach(() => {
    roles = [
      {
        name: 'admin',
        permissions: ['*'],
      },
      {
        name: 'editor',
        permissions: ['channel:read', 'channel:write', 'message:read', 'message:write'],
      },
      {
        name: 'viewer',
        permissions: ['channel:read', 'message:read'],
      },
      {
        name: 'channel-manager',
        permissions: ['channel:*'],
      },
    ];
    service = new PermissionEvaluationService(roles);
  });

  describe('hasPermission', () => {
    it('should grant permission from direct permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: [],
        permissions: ['channel:read', 'message:write'],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(true);
      expect(service.hasPermission(subject, 'message:write')).toBe(true);
    });

    it('should grant permission from role permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: [],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(true);
      expect(service.hasPermission(subject, 'message:read')).toBe(true);
    });

    it('should deny permission when not granted', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: [],
      };

      expect(service.hasPermission(subject, 'channel:write')).toBe(false);
      expect(service.hasPermission(subject, 'message:delete')).toBe(false);
    });

    it('should support wildcard permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['channel-manager'],
        permissions: [],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(true);
      expect(service.hasPermission(subject, 'channel:write')).toBe(true);
      expect(service.hasPermission(subject, 'channel:delete')).toBe(true);
      expect(service.hasPermission(subject, 'message:read')).toBe(false);
    });

    it('should support global wildcard permission', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['admin'],
        permissions: [],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(true);
      expect(service.hasPermission(subject, 'message:write')).toBe(true);
      expect(service.hasPermission(subject, 'anything:anything')).toBe(true);
    });

    it('should combine direct and role permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: ['message:write'],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(true); // From role
      expect(service.hasPermission(subject, 'message:write')).toBe(true); // Direct
    });

    it('should handle multiple roles', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer', 'editor'],
        permissions: [],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(true);
      expect(service.hasPermission(subject, 'channel:write')).toBe(true);
    });

    it('should handle unknown roles', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['unknown-role'],
        permissions: [],
      };

      expect(service.hasPermission(subject, 'channel:read')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when subject has all permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['editor'],
        permissions: [],
      };

      expect(
        service.hasAllPermissions(subject, ['channel:read', 'message:read'])
      ).toBe(true);
    });

    it('should return false when subject lacks any permission', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: [],
      };

      expect(
        service.hasAllPermissions(subject, ['channel:read', 'channel:write'])
      ).toBe(false);
    });

    it('should handle empty permission list', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: [],
        permissions: [],
      };

      expect(service.hasAllPermissions(subject, [])).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when subject has at least one permission', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: [],
      };

      expect(
        service.hasAnyPermission(subject, ['channel:read', 'channel:write'])
      ).toBe(true);
    });

    it('should return false when subject has none of the permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: [],
      };

      expect(
        service.hasAnyPermission(subject, ['channel:write', 'message:delete'])
      ).toBe(false);
    });

    it('should handle empty permission list', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: [],
        permissions: [],
      };

      expect(service.hasAnyPermission(subject, [])).toBe(false);
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return all effective permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer'],
        permissions: ['message:write'],
      };

      const effective = service.getEffectivePermissions(subject);

      expect(effective).toContain('channel:read');
      expect(effective).toContain('message:read');
      expect(effective).toContain('message:write');
      expect(effective).toHaveLength(3);
    });

    it('should deduplicate permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer', 'editor'],
        permissions: ['channel:read'],
      };

      const effective = service.getEffectivePermissions(subject);

      // channel:read appears in viewer, editor, and direct permissions
      const channelReadCount = effective.filter(p => p === 'channel:read').length;
      expect(channelReadCount).toBe(1);
    });

    it('should handle subject with no permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: [],
        permissions: [],
      };

      const effective = service.getEffectivePermissions(subject);

      expect(effective).toHaveLength(0);
    });

    it('should include permissions from multiple roles', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer', 'channel-manager'],
        permissions: [],
      };

      const effective = service.getEffectivePermissions(subject);

      expect(effective).toContain('channel:read');
      expect(effective).toContain('message:read');
      expect(effective).toContain('channel:*');
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['admin'],
        permissions: [],
      };

      expect(service.isAdmin(subject)).toBe(true);
    });

    it('should return true for owner role', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['owner'],
        permissions: [],
      };

      expect(service.isAdmin(subject)).toBe(true);
    });

    it('should return true for global wildcard permission', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: [],
        permissions: ['*'],
      };

      expect(service.isAdmin(subject)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: ['viewer', 'editor'],
        permissions: [],
      };

      expect(service.isAdmin(subject)).toBe(false);
    });

    it('should return false for users with no roles or permissions', () => {
      const subject: Subject = {
        id: 'user-1',
        type: 'user',
        roles: [],
        permissions: [],
      };

      expect(service.isAdmin(subject)).toBe(false);
    });
  });
});
