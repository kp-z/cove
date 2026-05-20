import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { createAuthRouter } from './auth.router';
import { AuthService } from '../../../application/services/auth/auth.service';
import { UserEntity } from '../../../domain/models/user/user.entity';
import { InvalidCredentialsError, InvalidTokenError, UserDisabledError } from '../../../application/services/auth/auth.errors';

describe('authRouter', () => {
  let mockAuthService: AuthService;
  let mockContext: any;
  let router: ReturnType<typeof createAuthRouter>;

  beforeEach(() => {
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      verifyToken: vi.fn(),
      changePassword: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    } as unknown as AuthService;

    mockContext = {
      userId: 'test-user-id',
      realmId: 'test-realm-id',
      userRole: 'owner',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      req: {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = createAuthRouter(mockAuthService);
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
      });

      vi.mocked(mockAuthService.register).mockResolvedValue({
        user,
        token: 'test-token-123',
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.register({
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token-123');
      expect(result.user).toHaveProperty('user_id', 'user-1');
      expect(result.user).toHaveProperty('username', 'testuser');
      expect(result.message).toBe('Registration successful');
      expect(mockAuthService.register).toHaveBeenCalledWith(
        {
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });

    it('should throw error for invalid username format', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.register({
          username: 'ab', // too short
          displayName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });

    it('should throw error for invalid email', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.register({
          username: 'testuser',
          displayName: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        })
      ).rejects.toThrow();
    });

    it('should throw error for short password', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.register({
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          password: 'short',
        })
      ).rejects.toThrow();
    });

    it('should handle registration errors', async () => {
      vi.mocked(mockAuthService.register).mockRejectedValue(
        new Error('Username already exists')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.register({
          username: 'existing',
          displayName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const user = UserEntity.create({
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
      });

      vi.mocked(mockAuthService.login).mockResolvedValue({
        user,
        token: 'test-token-123',
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.token).toBe('test-token-123');
      expect(result.user).toHaveProperty('user_id', 'user-1');
      expect(result.user).toHaveProperty('username', 'testuser');
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'testuser',
        'password123',
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });

    it('should throw UNAUTHORIZED for invalid credentials', async () => {
      vi.mocked(mockAuthService.login).mockRejectedValue(
        new InvalidCredentialsError('Invalid credentials')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.login({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid username or password');
    });

    it('should throw FORBIDDEN for disabled user', async () => {
      vi.mocked(mockAuthService.login).mockRejectedValue(
        new UserDisabledError('User is disabled')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.login({
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow('Account is disabled');
    });

    it('should handle other login errors', async () => {
      vi.mocked(mockAuthService.login).mockRejectedValue(
        new Error('Database error')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.login({
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      vi.mocked(mockAuthService.verifyToken).mockResolvedValue({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.verifyToken({
        token: 'valid-token',
      });

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.username).toBe('testuser');
      expect(result.role).toBe('user');
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UNAUTHORIZED for invalid token', async () => {
      vi.mocked(mockAuthService.verifyToken).mockRejectedValue(
        new InvalidTokenError('Invalid token')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.verifyToken({
          token: 'invalid-token',
        })
      ).rejects.toThrow('Invalid or expired token');
    });

    it('should handle token verification errors', async () => {
      vi.mocked(mockAuthService.verifyToken).mockRejectedValue(
        new Error('Verification failed')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.verifyToken({
          token: 'some-token',
        })
      ).rejects.toThrow();
    });
  });

  describe('me', () => {
    it('should return current user info', async () => {
      const caller = router.createCaller(mockContext);
      const result = await caller.me();

      expect(result.userId).toBe('test-user-id');
    });

    it('should require authentication', async () => {
      const unauthContext = {
        ...mockContext,
        userId: undefined,
      };

      const caller = router.createCaller(unauthContext);

      await expect(caller.me()).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      vi.mocked(mockAuthService.changePassword).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.changePassword({
        oldPassword: 'oldpass123',
        newPassword: 'newpass123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'test-user-id',
        'oldpass123',
        'newpass123'
      );
    });

    it('should throw UNAUTHORIZED for invalid old password', async () => {
      vi.mocked(mockAuthService.changePassword).mockRejectedValue(
        new InvalidCredentialsError('Invalid old password')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.changePassword({
          oldPassword: 'wrongpass',
          newPassword: 'newpass123',
        })
      ).rejects.toThrow('Invalid old password');
    });

    it('should validate new password length', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.changePassword({
          oldPassword: 'oldpass123',
          newPassword: 'short',
        })
      ).rejects.toThrow();
    });

    it('should require authentication', async () => {
      const unauthContext = {
        ...mockContext,
        userId: undefined,
      };

      const caller = router.createCaller(unauthContext);

      await expect(
        caller.changePassword({
          oldPassword: 'oldpass123',
          newPassword: 'newpass123',
        })
      ).rejects.toThrow();
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      vi.mocked(mockAuthService.requestPasswordReset).mockResolvedValue(
        'reset-token-123'
      );

      const caller = router.createCaller(mockContext);
      const result = await caller.requestPasswordReset({
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset email sent');
      expect(result.resetToken).toBe('reset-token-123');
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('should validate email format', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.requestPasswordReset({
          email: 'invalid-email',
        })
      ).rejects.toThrow();
    });

    it('should handle request errors', async () => {
      vi.mocked(mockAuthService.requestPasswordReset).mockRejectedValue(
        new Error('Email service error')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.requestPasswordReset({
          email: 'test@example.com',
        })
      ).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      vi.mocked(mockAuthService.resetPassword).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.resetPassword({
        resetToken: 'reset-token-123',
        newPassword: 'newpass123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successfully');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'reset-token-123',
        'newpass123'
      );
    });

    it('should throw UNAUTHORIZED for invalid reset token', async () => {
      vi.mocked(mockAuthService.resetPassword).mockRejectedValue(
        new InvalidTokenError('Invalid or expired reset token')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.resetPassword({
          resetToken: 'invalid-token',
          newPassword: 'newpass123',
        })
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should validate new password length', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.resetPassword({
          resetToken: 'reset-token-123',
          newPassword: 'short',
        })
      ).rejects.toThrow();
    });

    it('should handle reset errors', async () => {
      vi.mocked(mockAuthService.resetPassword).mockRejectedValue(
        new Error('Database error')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.resetPassword({
          resetToken: 'reset-token-123',
          newPassword: 'newpass123',
        })
      ).rejects.toThrow();
    });
  });
});
