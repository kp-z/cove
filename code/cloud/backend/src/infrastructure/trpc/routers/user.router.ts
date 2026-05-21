/**
 * User tRPC Router
 *
 * Procedures:
 * - create: 创建用户
 * - list: 获取用户列表（支持按 role 过滤）
 * - getById: 获取单个用户
 * - update: 更新用户
 * - delete: 删除用户
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { UserService } from '../../../application/services/user/user.service';
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';
import { requireRole, requireOwnerOrAdmin } from '../middleware/auth.middleware';

// Zod Schemas
const avatarSchema = z.object({
  url: z.string(),
  type: z.enum(['uploaded', 'dicebear', 'default']),
}).optional();

const createUserSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'user', 'visitor']).optional(),
  avatar: avatarSchema,
});

const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatar: avatarSchema,
  preference: z.object({
    pinned_channels: z.array(z.string()).max(10, 'Cannot pin more than 10 channels').optional(),
  }).optional(),
});

export const userRouter = (userService: UserService) =>
  router({
    // 创建用户 - 仅管理员和所有者
    create: protectedProcedure
      .use(requireRole(['admin', 'owner']))
      .input(createUserSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const user = await userService.createUser(input);
          return user.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取用户列表 - 需要认证
    list: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        role: z.enum(['owner', 'admin', 'user', 'visitor']).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const params = {
              page: input?.page || 1,
              limit: input?.limit || 20,
              role: input?.role,
            };

            const result = await userService.getUsersPaginated(params);

            return {
              users: result.items.map(u => u.toJSON()),
              total: result.total,
              page: result.page,
              limit: result.limit,
              totalPages: result.totalPages,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个用户 - 需要认证
    getById: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const user = await userService.getUserById(input.userId);
          return user.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新用户 - 只能修改自己或管理员修改他人
    update: protectedProcedure
      .use(requireOwnerOrAdmin)
      .input(z.object({
        userId: z.string(),
        data: updateUserSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Check if user is trying to modify their own data or is an admin/owner
          const userRole = ctx.userRole as 'owner' | 'admin' | 'member';
          const isOwnData = input.userId === ctx.userId;
          const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

          if (!isOwnData && !isAdminOrOwner) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You can only modify your own data',
            });
          }

          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const user = await userService.updateUser(input.userId, input.data);
          return user.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除用户 - 仅所有者（软删除）
    delete: protectedProcedure
      .use(requireRole(['owner']))
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await userService.deleteUser(input.userId);
          return { userId: input.userId, deleted: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 激活用户 - 仅管理员和所有者
    activate: protectedProcedure
      .use(requireRole(['admin', 'owner']))
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const user = await userService.activateUser(input.userId);
            return user.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 停用用户 - 仅管理员和所有者
    suspend: protectedProcedure
      .use(requireRole(['admin', 'owner']))
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const user = await userService.suspendUser(input.userId);
            return user.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 解锁用户 - 仅管理员和所有者
    unlock: protectedProcedure
      .use(requireRole(['admin', 'owner']))
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const user = await userService.unlockUser(input.userId);
            return user.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
