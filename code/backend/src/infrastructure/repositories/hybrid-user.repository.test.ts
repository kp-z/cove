import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { HybridUserRepository } from './hybrid-user.repository';
import { UserEntity, UserRole } from '../../domain/models/user/user.entity';
import { StorageService } from '../storage/storage.service';
import { TestDatabaseHelper } from './test-database.helper';
import { ILogger } from '../../application/interfaces/logger.interface';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Simple test logger
class TestLogger implements ILogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
  child() { return this; }
  setLevel() {}
}

describe('HybridUserRepository Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let repository: HybridUserRepository;
  let storageService: StorageService;
  let testStorageRoot: string;

  beforeAll(async () => {
    // Setup test database
    dbHelper = new TestDatabaseHelper();
    await dbHelper.setup();

    // Setup test storage
    testStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cove-user-repo-test-'));
    storageService = new StorageService(testStorageRoot);

    // Create repository
    const logger = new TestLogger();
    repository = new HybridUserRepository(
      dbHelper.getPrisma(),
      storageService,
      logger
    );
  });

  afterAll(async () => {
    await dbHelper.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await dbHelper.clearAllTables();
  });

  describe('save', () => {
    it('should save user to database and storage', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user' as UserRole,
        permissions: ['read', 'write'],
        createdAt: new Date(),
      });

      await repository.save(user);

      // Verify database record
      const dbRecord = await dbHelper.getPrisma().user.findUnique({
        where: { id: 'user-1' },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.username).toBe('testuser');
      expect(dbRecord?.email).toBe('test@example.com');

      // Verify storage file
      const storagePath = dbRecord?.profilePath;
      expect(storagePath).toBeDefined();
      const content = await storageService.loadJson(storagePath!);
      expect(content.permissions).toEqual(['read', 'write']);
    });

    it('should save user with avatar', async () => {
      const user = UserEntity.create({
        userId: 'user-2',
        username: 'avataruser',
        email: 'avatar@example.com',
        displayName: 'Avatar User',
        role: 'user' as UserRole,
        avatar: 'https://example.com/avatar.png',
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      const savedUser = await repository.findById('user-2');
      expect(savedUser).toBeDefined();
      expect(savedUser?.avatar).toBe('https://example.com/avatar.png');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const user = UserEntity.create({
        userId: 'user-3',
        username: 'finduser',
        email: 'find@example.com',
        displayName: 'Find User',
        role: 'admin' as UserRole,
        permissions: ['admin'],
        createdAt: new Date(),
      });

      await repository.save(user);

      const foundUser = await repository.findById('user-3');
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe('finduser');
      expect(foundUser?.role).toBe('admin');
      expect(foundUser?.permissions).toContain('admin');
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await repository.findById('non-existent');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const user = UserEntity.create({
        userId: 'user-4',
        username: 'uniqueuser',
        email: 'unique@example.com',
        displayName: 'Unique User',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      const foundUser = await repository.findByUsername('uniqueuser');
      expect(foundUser).toBeDefined();
      expect(foundUser?.userId).toBe('user-4');
      expect(foundUser?.email).toBe('unique@example.com');
    });

    it('should return null for non-existent username', async () => {
      const foundUser = await repository.findByUsername('nonexistent');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = UserEntity.create({
        userId: 'user-5',
        username: 'emailuser',
        email: 'email@example.com',
        displayName: 'Email User',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      const foundUser = await repository.findByEmail('email@example.com');
      expect(foundUser).toBeDefined();
      expect(foundUser?.userId).toBe('user-5');
      expect(foundUser?.username).toBe('emailuser');
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await repository.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('should find all users with specific role', async () => {
      const admin1 = UserEntity.create({
        userId: 'admin-1',
        username: 'admin1',
        email: 'admin1@example.com',
        displayName: 'Admin 1',
        role: 'admin' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      const admin2 = UserEntity.create({
        userId: 'admin-2',
        username: 'admin2',
        email: 'admin2@example.com',
        displayName: 'Admin 2',
        role: 'admin' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      const member = UserEntity.create({
        userId: 'member-1',
        username: 'member1',
        email: 'member1@example.com',
        displayName: 'Member 1',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(admin1);
      await repository.save(admin2);
      await repository.save(member);

      const admins = await repository.findByRole('admin' as UserRole);
      expect(admins).toHaveLength(2);
      expect(admins.map(u => u.userId)).toEqual(expect.arrayContaining(['admin-1', 'admin-2']));
    });

    it('should return empty array when no users with role', async () => {
      const users = await repository.findByRole('admin' as UserRole);
      expect(users).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should find all users', async () => {
      const user1 = UserEntity.create({
        userId: 'user-6',
        username: 'user6',
        email: 'user6@example.com',
        displayName: 'User 6',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      const user2 = UserEntity.create({
        userId: 'user-7',
        username: 'user7',
        email: 'user7@example.com',
        displayName: 'User 7',
        role: 'admin' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user1);
      await repository.save(user2);

      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(2);
      expect(allUsers.map(u => u.userId)).toEqual(expect.arrayContaining(['user-6', 'user-7']));
    });

    it('should return empty array when no users', async () => {
      const allUsers = await repository.findAll();
      expect(allUsers).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update user in database and storage', async () => {
      const user = UserEntity.create({
        userId: 'user-8',
        username: 'updateuser',
        email: 'update@example.com',
        displayName: 'Update User',
        role: 'user' as UserRole,
        permissions: ['read'],
        createdAt: new Date(),
      });

      await repository.save(user);

      // Update user
      const updatedUser = UserEntity.create({
        userId: 'user-8',
        username: 'updateuser',
        email: 'newemail@example.com',
        displayName: 'Updated User',
        role: 'admin' as UserRole,
        permissions: ['read', 'write', 'admin'],
        createdAt: user.createdAt,
      });

      await repository.update(updatedUser);

      // Verify update
      const foundUser = await repository.findById('user-8');
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('newemail@example.com');
      expect(foundUser?.displayName).toBe('Updated User');
      expect(foundUser?.role).toBe('admin');
      expect(foundUser?.permissions).toEqual(['read', 'write', 'admin']);
    });
  });

  describe('delete', () => {
    it('should delete user from database and storage', async () => {
      const user = UserEntity.create({
        userId: 'user-9',
        username: 'deleteuser',
        email: 'delete@example.com',
        displayName: 'Delete User',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      // Verify user exists
      let foundUser = await repository.findById('user-9');
      expect(foundUser).toBeDefined();

      // Delete user
      await repository.delete('user-9');

      // Verify user is deleted
      foundUser = await repository.findById('user-9');
      expect(foundUser).toBeNull();

      // Verify database record is deleted
      const dbRecord = await dbHelper.getPrisma().user.findUnique({
        where: { id: 'user-9' },
      });
      expect(dbRecord).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing user', async () => {
      const user = UserEntity.create({
        userId: 'user-10',
        username: 'existsuser',
        email: 'exists@example.com',
        displayName: 'Exists User',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      const exists = await repository.exists('user-10');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const exists = await repository.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      const user = UserEntity.create({
        userId: 'user-11',
        username: 'checkusername',
        email: 'checkusername@example.com',
        displayName: 'Check Username',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      const exists = await repository.usernameExists('checkusername');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent username', async () => {
      const exists = await repository.usernameExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const user = UserEntity.create({
        userId: 'user-12',
        username: 'checkemail',
        email: 'checkemail@example.com',
        displayName: 'Check Email',
        role: 'user' as UserRole,
        permissions: [],
        createdAt: new Date(),
      });

      await repository.save(user);

      const exists = await repository.emailExists('checkemail@example.com');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await repository.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent saves', async () => {
      const users = Array.from({ length: 5 }, (_, i) =>
        UserEntity.create({
          userId: `concurrent-${i}`,
          username: `concurrent${i}`,
          email: `concurrent${i}@example.com`,
          displayName: `Concurrent ${i}`,
          role: 'user' as UserRole,
          permissions: [],
          createdAt: new Date(),
        })
      );

      await Promise.all(users.map(user => repository.save(user)));

      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(5);
    });
  });

  describe('transaction consistency', () => {
    it('should maintain consistency between database and storage', async () => {
      const user = UserEntity.create({
        userId: 'user-13',
        username: 'consistent',
        email: 'consistent@example.com',
        displayName: 'Consistent User',
        role: 'user' as UserRole,
        permissions: ['read', 'write'],
        createdAt: new Date(),
      });

      await repository.save(user);

      // Verify database
      const dbRecord = await dbHelper.getPrisma().user.findUnique({
        where: { id: 'user-13' },
      });
      expect(dbRecord).toBeDefined();

      // Verify storage
      const content = await storageService.loadJson(dbRecord!.profilePath);
      expect(content.permissions).toEqual(['read', 'write']);

      // Verify through repository
      const foundUser = await repository.findById('user-13');
      expect(foundUser?.permissions).toEqual(['read', 'write']);
    });
  });
});
