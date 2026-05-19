import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { userRouter } from './user.router';
import { UserService } from '../../../application/services/user/user.service';
import { UserEntity } from '../../../domain/models/user/user.entity';
import { UserNotFoundError } from '../../../application/services/user/user.errors';

describe('userRouter', () => {
  let mockUserService: UserService;
  let mockContext: any;

  let router: ReturnType<typeof userRouter>;

  beforeEach(() => {
    mockUserService = {
      createUser: vi.fn(),
      getAllUsers: vi.fn(),
      getUsersByRole: vi.fn(),
      getUserById: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    } as unknown as UserService;


    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      req: {} as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = userRouter(mockUserService);
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
      });

      vi.mocked(mockUserService.createUser).mockResolvedValue(user);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
      });

      expect(result).toHaveProperty('user_id', 'user-1');
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw CONFLICT when username already exists', async () => {
      const error = new Error('Username already exists');
      error.name = 'UsernameAlreadyExistsError';
      vi.mocked(mockUserService.createUser).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.create({
          username: 'existing',
          displayName: 'Test',
          email: 'test@example.com',
        })
      ).rejects.toThrow('Username already exists');
    });

    it('should throw CONFLICT when email already exists', async () => {
      const error = new Error('Email already exists');
      error.name = 'EmailAlreadyExistsError';
      vi.mocked(mockUserService.createUser).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.create({
          username: 'testuser',
          displayName: 'Test',
          email: 'existing@example.com',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('list', () => {
    it('should list all users', async () => {
      const users = [
        UserEntity.create({
          userId: 'user-1',
          username: 'user1',
          displayName: 'User 1',
          email: 'user1@example.com',
          role: 'user',
          createdAt: new Date(),
        }),
        UserEntity.create({
          userId: 'user-2',
          username: 'user2',
          displayName: 'User 2',
          email: 'user2@example.com',
          role: 'admin',
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockUserService.getAllUsers).mockResolvedValue(users);

      const caller = router.createCaller(mockContext);
      const result = await caller.list();

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list users by role', async () => {
      const users = [
        UserEntity.create({
          userId: 'user-1',
          username: 'admin1',
          displayName: 'Admin 1',
          email: 'admin1@example.com',
          role: 'admin',
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockUserService.getUsersByRole).mockResolvedValue(users);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ role: 'admin' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe('admin');
      expect(mockUserService.getUsersByRole).toHaveBeenCalledWith('admin');
    });
  });

  describe('getById', () => {
    it('should get user by id', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
      });

      vi.mocked(mockUserService.getUserById).mockResolvedValue(user);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ userId: 'user-1' });

      expect(result).toHaveProperty('user_id', 'user-1');
      expect(result).toHaveProperty('username', 'testuser');
    });

    it('should throw NOT_FOUND when user not found', async () => {
      const error = new UserNotFoundError('user-1');
      error.name = 'UserNotFoundError';
      vi.mocked(mockUserService.getUserById).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getById({ userId: 'nonexistent' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Updated Name',
        email: 'updated@example.com',
        role: 'user',
        createdAt: new Date(),
      });

      vi.mocked(mockUserService.updateUser).mockResolvedValue(user);

      const caller = router.createCaller(mockContext);
      const result = await caller.update({
        userId: 'user-1',
        data: {
          displayName: 'Updated Name',
          email: 'updated@example.com',
        },
      });

      expect(result).toHaveProperty('display_name', 'Updated Name');
      expect(result).toHaveProperty('email', 'updated@example.com');
    });

    it('should throw NOT_FOUND when user not found', async () => {
      const error = new UserNotFoundError('user-1');
      error.name = 'UserNotFoundError';
      vi.mocked(mockUserService.updateUser).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.update({
          userId: 'nonexistent',
          data: { displayName: 'New Name' },
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      vi.mocked(mockUserService.deleteUser).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ userId: 'user-1' });

      expect(result).toEqual({ userId: 'user-1', deleted: true });
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw NOT_FOUND when user not found', async () => {
      const error = new UserNotFoundError('user-1');
      error.name = 'UserNotFoundError';
      vi.mocked(mockUserService.deleteUser).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.delete({ userId: 'nonexistent' })
      ).rejects.toThrow('User not found');
    });
  });
});
