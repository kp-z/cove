/**
 * Server tRPC Router
 *
 * Procedures:
 * - create: 创建服务器
 * - list: 获取服务器列表
 * - getById: 获取单个服务器
 * - update: 更新服务器
 * - archive: 归档服务器
 * - activate: 激活服务器
 * - delete: 删除服务器
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { ServerService } from '../../../application/services/server/server.service';
import { ServerContext } from '../../../application/context/server-context';
import { runWithContext } from '../../../application/context/server-context-store';

// Zod Schemas
const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  description: z.string().optional(),
  ownerId: z.string(),
  visibility: z.enum(['public', 'private']).optional(),
});

const updateServerSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  settings: z.record(z.unknown()).optional(),
  features: z.array(z.string()).optional(),
});

export const serverRouter = (serverService: ServerService) =>
  router({
    // 创建服务器
    create: publicProcedure
      .input(createServerSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await serverService.createServer(input);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取服务器列表
    list: publicProcedure
      .input(z.object({
        ownerId: z.string().optional(),
        status: z.enum(['active', 'archived']).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const servers = await serverService.queryServers(input);

            return {
              servers: servers.map(s => s.toJSON()),
              total: servers.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个服务器
    getById: publicProcedure
      .input(z.object({ serverId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await serverService.getServerById(input.serverId);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新服务器
    update: publicProcedure
      .input(z.object({
        serverId: z.string(),
        data: updateServerSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await serverService.updateServer(input.serverId, input.data);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 归档服务器
    archive: publicProcedure
      .input(z.object({ serverId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await serverService.archiveServer(input.serverId);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 激活服务器
    activate: publicProcedure
      .input(z.object({ serverId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await serverService.activateServer(input.serverId);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除服务器
    delete: publicProcedure
      .input(z.object({ serverId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await serverService.deleteServer(input.serverId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // ============================================
    // Server Member Management
    // ============================================

    // 添加成员
    addMember: publicProcedure
      .input(z.object({
        serverId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member', 'guest']),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(input.serverId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await serverService.addServerMember(
              input.serverId,
              input.userId,
              input.role
            );
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 移除成员
    removeMember: publicProcedure
      .input(z.object({
        serverId: z.string(),
        userId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(input.serverId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await serverService.removeServerMember(input.serverId, input.userId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新成员角色
    updateMemberRole: publicProcedure
      .input(z.object({
        serverId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member', 'guest']),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(input.serverId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await serverService.updateServerMemberRole(
              input.serverId,
              input.userId,
              input.role
            );
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取成员列表
    getMembers: publicProcedure
      .input(z.object({
        serverId: z.string(),
        role: z.enum(['owner', 'admin', 'member', 'guest']).optional(),
        status: z.enum(['active', 'suspended', 'left']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(input.serverId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const members = await serverService.getServerMembers(input.serverId, {
              role: input.role,
              status: input.status,
            });
            return {
              members: members.map(m => m.toJSON()),
              total: members.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个成员
    getMember: publicProcedure
      .input(z.object({
        serverId: z.string(),
        userId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(input.serverId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await serverService.getServerMember(input.serverId, input.userId);
            if (!member) {
              throw new Error('Member not found');
            }
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
