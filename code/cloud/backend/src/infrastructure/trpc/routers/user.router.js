"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Zod Schemas
const createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['owner', 'admin', 'user', 'visitor']).optional(),
    avatar: zod_1.z.string().optional(),
});
const updateUserSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    avatar: zod_1.z.string().optional(),
    preference: zod_1.z.object({
        pinned_channels: zod_1.z.array(zod_1.z.string()).max(10, 'Cannot pin more than 10 channels').optional(),
    }).optional(),
});
const userRouter = (userService) => (0, trpc_1.router)({
    // 创建用户 - 仅管理员和所有者
    create: trpc_1.protectedProcedure
        .use((0, auth_middleware_1.requireRole)(['admin', 'owner']))
        .input(createUserSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const user = await userService.createUser(input);
                return user.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取用户列表 - 需要认证
    list: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        page: zod_1.z.number().min(1).default(1),
        limit: zod_1.z.number().min(1).max(100).default(20),
        role: zod_1.z.enum(['owner', 'admin', 'user', 'visitor']).optional(),
    }).optional())
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
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
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个用户 - 需要认证
    getById: trpc_1.protectedProcedure
        .input(zod_1.z.object({ userId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const user = await userService.getUserById(input.userId);
                return user.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新用户 - 只能修改自己或管理员修改他人
    update: trpc_1.protectedProcedure
        .use(auth_middleware_1.requireOwnerOrAdmin)
        .input(zod_1.z.object({
        userId: zod_1.z.string(),
        data: updateUserSchema,
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            // Check if user is trying to modify their own data or is an admin/owner
            const userRole = ctx.userRole;
            const isOwnData = input.userId === ctx.userId;
            const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';
            if (!isOwnData && !isAdminOrOwner) {
                throw new server_1.TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You can only modify your own data',
                });
            }
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const user = await userService.updateUser(input.userId, input.data);
                return user.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除用户 - 仅所有者（软删除）
    delete: trpc_1.protectedProcedure
        .use((0, auth_middleware_1.requireRole)(['owner']))
        .input(zod_1.z.object({ userId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await userService.deleteUser(input.userId);
                return { userId: input.userId, deleted: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 激活用户 - 仅管理员和所有者
    activate: trpc_1.protectedProcedure
        .use((0, auth_middleware_1.requireRole)(['admin', 'owner']))
        .input(zod_1.z.object({ userId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const user = await userService.activateUser(input.userId);
                return user.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 停用用户 - 仅管理员和所有者
    suspend: trpc_1.protectedProcedure
        .use((0, auth_middleware_1.requireRole)(['admin', 'owner']))
        .input(zod_1.z.object({ userId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const user = await userService.suspendUser(input.userId);
                return user.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 解锁用户 - 仅管理员和所有者
    unlock: trpc_1.protectedProcedure
        .use((0, auth_middleware_1.requireRole)(['admin', 'owner']))
        .input(zod_1.z.object({ userId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const user = await userService.unlockUser(input.userId);
                return user.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.userRouter = userRouter;
