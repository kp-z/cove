import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, CreateUserDTO, UpdateUserDTO, UserNotFoundError, UsernameAlreadyExistsError, EmailAlreadyExistsError } from './user.service';
import { UserEntity, UserRole } from '../../../domain/models/user/user.entity';
import {
  IUserRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: IUserRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockUserRepository = {
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      findByRole: vi.fn(),
      findAll: vi.fn(),
      exists: vi.fn(),
      usernameExists: vi.fn(),
      emailExists: vi.fn(),
    } as unknown as IUserRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    userService = new UserService(
      mockUserRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      vi.mocked(mockUserRepository.usernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.emailExists).mockResolvedValue(false);

      const dto: CreateUserDTO = {
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
      };

      const result = await userService.createUser(dto);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.username).toBe(dto.username);
      expect(result.email).toBe(dto.email);
      expect(result.role).toBe('user');
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(UserEntity));
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.created',
          aggregateType: 'User',
        })
      );
    });

    it('should create user with custom role', async () => {
      vi.mocked(mockUserRepository.usernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.emailExists).mockResolvedValue(false);

      const dto: CreateUserDTO = {
        username: 'admin',
        displayName: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      };

      const result = await userService.createUser(dto);

      expect(result.role).toBe('admin');
    });

    it('should throw UsernameAlreadyExistsError when username exists', async () => {
      vi.mocked(mockUserRepository.usernameExists).mockResolvedValue(true);

      const dto: CreateUserDTO = {
        username: 'existing',
        displayName: 'Test',
        email: 'test@example.com',
      };

      await expect(userService.createUser(dto)).rejects.toThrow(
        UsernameAlreadyExistsError
      );
    });

    it('should throw EmailAlreadyExistsError when email exists', async () => {
      vi.mocked(mockUserRepository.usernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.emailExists).mockResolvedValue(true);

      const dto: CreateUserDTO = {
        username: 'newuser',
        displayName: 'Test',
        email: 'existing@example.com',
      };

      await expect(userService.createUser(dto)).rejects.toThrow(
        EmailAlreadyExistsError
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      const result = await userService.getUserById('user-1');

      expect(result).toBe(user);
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(userService.getUserById('nonexistent')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(user);

      const result = await userService.getUserByUsername('testuser');

      expect(result).toBe(user);
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);

      await expect(userService.getUserByUsername('nonexistent')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toBe(user);
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      await expect(userService.getUserByEmail('nonexistent@example.com')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const users = [
        UserEntity.create({
          userId: 'user-1',
          username: 'admin1',
          displayName: 'Admin 1',
          email: 'admin1@example.com',
          role: 'admin',
          permissions: [],
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockUserRepository.findByRole).mockResolvedValue(users);

      const result = await userService.getUsersByRole('admin');

      expect(result).toEqual(users);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [
        UserEntity.create({
          userId: 'user-1',
          username: 'user1',
          displayName: 'User 1',
          email: 'user1@example.com',
          role: 'user',
          permissions: [],
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockUserRepository.findAll).mockResolvedValue(users);

      const result = await userService.getAllUsers();

      expect(result).toEqual(users);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Old Name',
        email: 'old@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.emailExists).mockResolvedValue(false);

      const dto: UpdateUserDTO = {
        displayName: 'New Name',
        email: 'new@example.com',
      };

      const result = await userService.updateUser('user-1', dto);

      expect(result.displayName).toBe('New Name');
      expect(result.email).toBe('new@example.com');
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.updated',
        })
      );
    });

    it('should throw EmailAlreadyExistsError when updating to existing email', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test',
        email: 'old@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      const existingUser = UserEntity.create({
        userId: 'user-2',
        username: 'other',
        displayName: 'Other',
        email: 'existing@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.emailExists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);

      const dto: UpdateUserDTO = {
        email: 'existing@example.com',
      };

      await expect(userService.updateUser('user-1', dto)).rejects.toThrow(
        EmailAlreadyExistsError
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      const result = await userService.updateUserRole('user-1', 'admin');

      expect(result.role).toBe('admin');
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.role_changed',
        })
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        createdAt: new Date(),
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      await userService.deleteUser('user-1');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.deleted',
        })
      );
    });

    it('should throw UserNotFoundError when deleting nonexistent user', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(userService.deleteUser('nonexistent')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      vi.mocked(mockUserRepository.usernameExists).mockResolvedValue(false);
      vi.mocked(mockUserRepository.emailExists).mockResolvedValue(false);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      const dto: CreateUserDTO = {
        username: 'testuser',
        displayName: 'Test',
        email: 'test@example.com',
      };

      await expect(userService.createUser(dto)).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'user.created',
        })
      );
    });
  });
});
