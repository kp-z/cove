/**
 * Realm Permission Middleware - 声明式权限检查中间件
 *
 * 职责：
 * - 在 tRPC Router 层拦截请求
 * - 进行粗粒度权限检查（非成员、基础权限）
 * - 细粒度业务规则检查仍在 Service 层
 *
 * 使用方式：
 * ```typescript
 * router.update.use(requireRealmPermission(RealmPermission.SERVER_MANAGE))
 * ```
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc';
import { RealmPermission } from '../../../domain/models/realm-member/realm-member.entity';
import { InsufficientPermissionError } from '../../../application/services/realm/realm.errors';

/**
 * 声明式权限中间件
 * 在 Router 层拦截请求，进行权限检查
 *
 * @param permission - 所需的权限
 * @returns tRPC middleware
 */
export const requireRealmPermission = (permission: RealmPermission) => {
  return middleware(async ({ ctx, next, input }) => {
    // Check authentication
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Extract realmId from input
    const realmId = (input as any).realmId;
    if (!realmId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'realmId is required',
      });
    }

    // Check permission using permission service
    if (!ctx.permissionService) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Permission service not configured',
      });
    }

    try {
      await ctx.permissionService.requirePermission(
        ctx.userId,
        realmId,
        permission
      );
    } catch (error) {
      if (error instanceof InsufficientPermissionError) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Missing permission: ${permission}`,
          cause: error,
        });
      }
      throw error;
    }

    return next({ ctx });
  });
};

/**
 * 要求任一权限（OR 逻辑）
 *
 * @param permissions - 权限列表，满足任一即可
 * @returns tRPC middleware
 */
export const requireAnyRealmPermission = (permissions: RealmPermission[]) => {
  return middleware(async ({ ctx, next, input }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const realmId = (input as any).realmId;
    if (!realmId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'realmId is required',
      });
    }

    if (!ctx.permissionService) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Permission service not configured',
      });
    }

    try {
      await ctx.permissionService.requireAnyPermission(
        ctx.userId,
        realmId,
        permissions
      );
    } catch (error) {
      if (error instanceof InsufficientPermissionError) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Missing one of permissions: ${permissions.join(', ')}`,
          cause: error,
        });
      }
      throw error;
    }

    return next({ ctx });
  });
};

/**
 * 要求所有权限（AND 逻辑）
 *
 * @param permissions - 权限列表，必须全部满足
 * @returns tRPC middleware
 */
export const requireAllRealmPermissions = (permissions: RealmPermission[]) => {
  return middleware(async ({ ctx, next, input }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const realmId = (input as any).realmId;
    if (!realmId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'realmId is required',
      });
    }

    if (!ctx.permissionService) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Permission service not configured',
      });
    }

    try {
      await ctx.permissionService.requireAllPermissions(
        ctx.userId,
        realmId,
        permissions
      );
    } catch (error) {
      if (error instanceof InsufficientPermissionError) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Missing permissions: ${permissions.join(', ')}`,
          cause: error,
        });
      }
      throw error;
    }

    return next({ ctx });
  });
};
