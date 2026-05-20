"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.realmRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const createRealmSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    displayName: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    ownerId: zod_1.z.string(),
    visibility: zod_1.z.enum(['public', 'private']).optional(),
});
const updateRealmSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    visibility: zod_1.z.enum(['public', 'private']).optional(),
    status: zod_1.z.enum(['active', 'suspended', 'archived']).optional(),
    settings: zod_1.z.record(zod_1.z.unknown()).optional(),
    features: zod_1.z.array(zod_1.z.string()).optional(),
});
const realmRouter = (realmService) => (0, trpc_1.router)({
    // 创建服务器
    create: trpc_1.publicProcedure
        .input(createRealmSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const server = await realmService.createRealm(input);
                return server.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取服务器列表
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({
        ownerId: zod_1.z.string().optional(),
        status: zod_1.z.enum(['active', 'archived']).optional(),
    }).optional())
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const servers = await realmService.queryServers(input);
                return {
                    realms: servers.map(s => s.toJSON()),
                    total: servers.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个服务器
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ realmId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const server = await realmService.getRealmById(input.realmId);
                return server.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新服务器
    update: trpc_1.publicProcedure
        .input(zod_1.z.object({
        realmId: zod_1.z.string(),
        data: updateRealmSchema,
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const server = await realmService.updateRealm(input.realmId, input.data);
                return server.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除服务器
    delete: trpc_1.publicProcedure
        .input(zod_1.z.object({ realmId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await realmService.deleteRealm(input.realmId);
                return { success: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // ============================================
    // Realm Member Management
    // ============================================
    // 添加成员
    addMember: trpc_1.publicProcedure
        .input(zod_1.z.object({
        realmId: zod_1.z.string(),
        userId: zod_1.z.string(),
        role: zod_1.z.enum(['admin', 'member', 'guest']),
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(input.realmId, ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const member = await realmService.addRealmMember(input.realmId, input.userId, input.role);
                return member.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新成员
    updateMember: trpc_1.publicProcedure
        .input(zod_1.z.object({
        realmId: zod_1.z.string(),
        userId: zod_1.z.string(),
        role: zod_1.z.enum(['admin', 'member', 'guest']).optional(),
        status: zod_1.z.enum(['active', 'suspended', 'left']).optional(),
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(input.realmId, ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const member = await realmService.updateRealmMember(input.realmId, input.userId, { role: input.role, status: input.status });
                return member.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取成员列表
    getMembers: trpc_1.publicProcedure
        .input(zod_1.z.object({
        realmId: zod_1.z.string(),
        role: zod_1.z.enum(['owner', 'admin', 'member', 'guest']).optional(),
        status: zod_1.z.enum(['active', 'suspended', 'left']).optional(),
    }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(input.realmId, ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const members = await realmService.getRealmMembers(input.realmId, {
                    role: input.role,
                    status: input.status,
                });
                return {
                    members: members.map(m => m.toJSON()),
                    total: members.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个成员
    getMember: trpc_1.publicProcedure
        .input(zod_1.z.object({
        realmId: zod_1.z.string(),
        userId: zod_1.z.string(),
    }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(input.realmId, ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const member = await realmService.getServerMember(input.realmId, input.userId);
                if (!member) {
                    throw new Error('Member not found');
                }
                return member.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.realmRouter = realmRouter;
