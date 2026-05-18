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
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { UserService } from '../../../application/services/user/user.service';

// Zod Schemas
const createUserSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'user', 'visitor']).optional(),
  avatar: z.string().optional(),
});

const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
  preference: z.object({
    pinned_channels: z.array(z.string()).max(10, 'Cannot pin more than 10 channels').optional(),
  }).optional(),
});

export const userRouter = (userService: UserService) =>
  router({
    // 创建用户
    create: publicProcedure
      .input(createUserSchema)
      .mutation(async ({ input }) => {
        try {
          const user = await userService.createUser(input);
          return user.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取用户列表
    list: publicProcedure
      .input(z.object({
        role: z.enum(['owner', 'admin', 'user', 'visitor']).optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          const users = input?.role
            ? await userService.getUsersByRole(input.role)
            : await userService.getAllUsers();

          return {
            users: users.map(u => u.toJSON()),
            total: users.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个用户
    getById: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        try {
          const user = await userService.getUserById(input.userId);
          return user.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新用户
    update: publicProcedure
      .input(z.object({
        userId: z.string(),
        data: updateUserSchema,
      }))
      .mutation(async ({ input }) => {
        try {
          const user = await userService.updateUser(input.userId, input.data);
          return user.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除用户
    delete: publicProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await userService.deleteUser(input.userId);
          return { userId: input.userId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
