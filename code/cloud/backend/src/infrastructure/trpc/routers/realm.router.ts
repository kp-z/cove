/**
 * Realm tRPC Router
 *
 * Procedures:
 * - create: 创建服务器
 * - list: 获取服务器列表
 * - getById: 获取单个服务器
 * - update: 更新服务器（支持 status 字段更新）
 * - delete: 删除服务器
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { RealmService } from '../../../application/services/realm/realm.service';
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';

// Zod Schemas
const createRealmSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  description: z.string().optional(),
  ownerId: z.string(),
  visibility: z.enum(['public', 'private']).optional(),
});

const updateRealmSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
  settings: z.record(z.unknown()).optional(),
  features: z.array(z.string()).optional(),
});

export const realmRouter = (realmService: RealmService) =>
  router({
    // 创建服务器
    create: publicProcedure
      .input(createRealmSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await realmService.createRealm(input);
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
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const servers = await realmService.queryServers(input);

            return {
              realms: servers.map(s => s.toJSON()),
              total: servers.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个服务器
    getById: publicProcedure
      .input(z.object({ realmId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await realmService.getRealmById(input.realmId);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新服务器
    update: publicProcedure
      .input(z.object({
        realmId: z.string(),
        data: updateRealmSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await realmService.updateRealm(input.realmId, input.data);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除服务器
    delete: publicProcedure
      .input(z.object({ realmId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await realmService.deleteRealm(input.realmId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // ============================================
    // Realm Member Management
    // ============================================

    // 添加成员
    addMember: publicProcedure
      .input(z.object({
        realmId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member', 'guest']),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await realmService.addRealmMember(
              input.realmId,
              input.userId,
              input.role
            );
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新成员
    updateMember: publicProcedure
      .input(z.object({
        realmId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member', 'guest']).optional(),
        status: z.enum(['active', 'suspended', 'left']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await realmService.updateRealmMember(
              input.realmId,
              input.userId,
              { role: input.role, status: input.status }
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
        realmId: z.string(),
        role: z.enum(['owner', 'admin', 'member', 'guest']).optional(),
        status: z.enum(['active', 'suspended', 'left']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const members = await realmService.getRealmMembers(input.realmId, {
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
        realmId: z.string(),
        userId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await realmService.getServerMember(input.realmId, input.userId);
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
