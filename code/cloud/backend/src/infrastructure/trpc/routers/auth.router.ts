/**
 * Auth Router - 认证相关 API
 */

import { z } from 'zod';
import { router, procedure, protectedProcedure } from '../trpc';
import type { AuthService } from '../../../application/services/auth/auth.service';
import {
  AccountLockedError,
  InvalidCredentialsError,
  InvalidTokenError,
  UserDisabledError,
} from '../../../application/services/auth/auth.errors';
import { TRPCError } from '@trpc/server';

// 注册请求 schema
const registerSchema = z.object({
  username: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must contain only letters, numbers, and underscores',
  }),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

// 登录请求 schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  // 记住我：勾选后签发长有效期令牌，不传默认按短有效期处理
  rememberMe: z.boolean().optional(),
});

// 验证令牌请求 schema
const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// 修改密码 schema
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// 请求密码重置 schema
const requestPasswordResetSchema = z.object({
  email: z.string().email('Valid email is required'),
});

// 重置密码 schema
const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export function createAuthRouter(authService: AuthService) {
  return router({
    /**
     * 用户注册接口（公开）
     */
    register: procedure
      .input(registerSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // Extract IP address and User Agent from request
          const ipAddress = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                           ctx.req.socket.remoteAddress;
          const userAgent = ctx.req.headers['user-agent'] as string | undefined;

          const result = await authService.register(input, ipAddress, userAgent);

          return {
            success: true,
            user: result.user.toJSON(),
            token: result.token,
            defaultRealmId: result.defaultRealmId,
            message: 'Registration successful',
          };
        } catch (error: any) {
          // TRPCError 会被直接抛出
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Registration failed',
          });
        }
      }),

    /**
     * 登录接口（公开）
     */
    login: procedure
      .input(loginSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // Extract IP address and User Agent from request
          const ipAddress = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                           ctx.req.socket.remoteAddress;
          const userAgent = ctx.req.headers['user-agent'] as string | undefined;

          const result = await authService.login(input.username, input.password, ipAddress, userAgent, input.rememberMe);

          return {
            token: result.token,
            user: result.user.toJSON(),
            defaultRealmId: result.defaultRealmId,
            context: result.context,
          };
        } catch (error: any) {
          // 已是 TRPCError 时原样抛出，避免再包一层 INTERNAL_SERVER_ERROR
          if (error instanceof TRPCError) {
            throw error;
          }
          if (error instanceof InvalidCredentialsError) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Invalid username or password',
            });
          }
          if (error instanceof AccountLockedError) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: error.message,
            });
          }
          if (error instanceof UserDisabledError) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Account is disabled',
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Login failed',
          });
        }
      }),

    /**
     * 验证令牌接口（公开）
     */
    verifyToken: procedure
      .input(verifyTokenSchema)
      .query(async ({ input }) => {
        try {
          const payload = await authService.verifyToken(input.token);

          return {
            valid: true,
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
          };
        } catch (error) {
          if (error instanceof InvalidTokenError) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Invalid or expired token',
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token verification failed',
          });
        }
      }),

    /**
     * 获取当前用户信息（受保护）
     */
    me: protectedProcedure
      .query(async ({ ctx }) => {
        // ctx.userId 已经由 protectedProcedure 验证存在
        // 这里可以从数据库获取完整用户信息
        return {
          userId: ctx.userId,
          // 可以扩展返回更多用户信息
        };
      }),

    /**
     * 修改密码（受保护）
     */
    changePassword: protectedProcedure
      .input(changePasswordSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          await authService.changePassword(ctx.userId!, input.oldPassword, input.newPassword, ctx.realmId!);

          return {
            success: true,
            message: 'Password changed successfully',
          };
        } catch (error: any) {
          if (error instanceof InvalidCredentialsError) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Invalid old password',
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to change password',
          });
        }
      }),

    /**
     * 请求密码重置（公开）
     */
    requestPasswordReset: procedure
      .input(requestPasswordResetSchema)
      .mutation(async ({ input }) => {
        try {
          const resetToken = await authService.requestPasswordReset(input.email);

          // 在实际生产环境中，应该通过邮件发送 resetToken
          // 这里为了演示，直接返回 token
          return {
            success: true,
            message: 'Password reset email sent',
            resetToken, // 生产环境不应返回，应通过邮件发送
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to request password reset',
          });
        }
      }),

    /**
     * 重置密码（公开）
     */
    resetPassword: procedure
      .input(resetPasswordSchema)
      .mutation(async ({ input }) => {
        try {
          await authService.resetPassword(input.resetToken, input.newPassword);

          return {
            success: true,
            message: 'Password reset successfully',
          };
        } catch (error: any) {
          if (error instanceof InvalidTokenError) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to reset password',
          });
        }
      }),
  });
}
