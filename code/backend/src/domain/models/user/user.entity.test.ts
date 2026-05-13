import { describe, it, expect } from 'vitest';
import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  const validProps = {
    userId: 'user-001',
    username: 'kp-user',
    displayName: 'KP',
    email: 'kp@example.com',
    role: 'owner' as const,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  describe('creation', () => {
    it('should create a user with valid properties', () => {
      const user = UserEntity.create(validProps);

      expect(user.userId).toBe('user-001');
      expect(user.username).toBe('kp-user');
      expect(user.displayName).toBe('KP');
      expect(user.email).toBe('kp@example.com');
      expect(user.role).toBe('owner');
    });

    it('should throw error for empty userId', () => {
      expect(() => {
        UserEntity.create({ ...validProps, userId: '' });
      }).toThrow('User ID cannot be empty');
    });

    it('should throw error for empty username', () => {
      expect(() => {
        UserEntity.create({ ...validProps, username: '' });
      }).toThrow('Username cannot be empty');
    });

    it('should throw error for invalid email', () => {
      expect(() => {
        UserEntity.create({ ...validProps, email: 'not-an-email' });
      }).toThrow('Invalid email format');
    });

    it('should throw error for invalid role', () => {
      expect(() => {
        UserEntity.create({ ...validProps, role: 'superadmin' as any });
      }).toThrow('Invalid role');
    });
  });

  describe('role checks', () => {
    it('should identify owner role', () => {
      const user = UserEntity.create(validProps);
      expect(user.isOwner()).toBe(true);
      expect(user.isAdmin()).toBe(false);
    });

    it('should identify admin role', () => {
      const user = UserEntity.create({ ...validProps, role: 'admin' });
      expect(user.isAdmin()).toBe(true);
      expect(user.isOwner()).toBe(false);
    });

    it('owner should have admin privileges', () => {
      const user = UserEntity.create(validProps);
      expect(user.hasAdminPrivileges()).toBe(true);
    });

    it('admin should have admin privileges', () => {
      const user = UserEntity.create({ ...validProps, role: 'admin' });
      expect(user.hasAdminPrivileges()).toBe(true);
    });

    it('regular user should not have admin privileges', () => {
      const user = UserEntity.create({ ...validProps, role: 'user' });
      expect(user.hasAdminPrivileges()).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should return new instance when updating displayName', () => {
      const user = UserEntity.create(validProps);
      const updated = user.updateDisplayName('New Name');

      expect(updated.displayName).toBe('New Name');
      expect(user.displayName).toBe('KP'); // original unchanged
      expect(updated).not.toBe(user);
    });

    it('should return new instance when updating role', () => {
      const user = UserEntity.create(validProps);
      const updated = user.updateRole('admin');

      expect(updated.role).toBe('admin');
      expect(user.role).toBe('owner');
    });

    it('should return new instance when updating email', () => {
      const user = UserEntity.create(validProps);
      const updated = user.updateEmail('new@example.com');

      expect(updated.email).toBe('new@example.com');
      expect(user.email).toBe('kp@example.com');
    });

    it('should throw error when updating to invalid email', () => {
      const user = UserEntity.create(validProps);
      expect(() => user.updateEmail('bad')).toThrow('Invalid email format');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const user = UserEntity.create(validProps);
      const json = user.toJSON();

      expect(json).toEqual({
        user_id: 'user-001',
        username: 'kp-user',
        display_name: 'KP',
        email: 'kp@example.com',
        role: 'owner',
        avatar: undefined,
        permissions: [],
        created_at: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        user_id: 'user-001',
        username: 'kp-user',
        display_name: 'KP',
        email: 'kp@example.com',
        role: 'owner' as const,
        avatar: 'avatars/kp.png',
        permissions: ['project.create'],
        created_at: '2026-01-01T00:00:00.000Z',
      };
      const user = UserEntity.fromJSON(json);

      expect(user.userId).toBe('user-001');
      expect(user.avatar).toBe('avatars/kp.png');
      expect(user.permissions).toEqual(['project.create']);
    });
  });

  describe('equality', () => {
    it('should be equal when userId matches', () => {
      const user1 = UserEntity.create(validProps);
      const user2 = UserEntity.create({ ...validProps, displayName: 'Different' });

      expect(user1.equals(user2)).toBe(true); // same ID = same entity
    });

    it('should not be equal when userId differs', () => {
      const user1 = UserEntity.create(validProps);
      const user2 = UserEntity.create({ ...validProps, userId: 'user-002' });

      expect(user1.equals(user2)).toBe(false);
    });
  });
});
