"use strict";
/**
 * Thread tRPC Router
 *
 * Procedures:
 * - reply: 回复线程
 * - getMessages: 获取线程消息
 * - getMetadata: 获取线程元数据
 * - listByChannel: 获取频道线程列表
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.threadRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const replyInThreadSchema = zod_1.z.object({
    threadId: zod_1.z.string(),
    senderId: zod_1.z.string(),
    senderType: zod_1.z.enum(['human', 'agent']).optional().default('human'),
    content: zod_1.z.string().min(1),
});
const threadRouter = (threadService) => (0, trpc_1.router)({
    // 回复线程
    reply: trpc_1.publicProcedure
        .input(replyInThreadSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const message = await threadService.replyInThread(input.threadId, input.senderId, input.senderType, input.content);
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取线程消息
    getMessages: trpc_1.publicProcedure
        .input(zod_1.z.object({
        threadId: zod_1.z.string(),
        cursor: zod_1.z.string().optional(),
        limit: zod_1.z.number().min(1).max(100).optional(),
    }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const messages = await threadService.listThreadMessages(input.threadId, input.cursor, input.limit);
                return {
                    messages: messages.map(m => m.toJSON()),
                    total: messages.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取线程元数据
    getMetadata: trpc_1.publicProcedure
        .input(zod_1.z.object({ threadId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const thread = await threadService.getOrCreateThread(input.threadId);
                return thread.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取频道线程列表
    listByChannel: trpc_1.publicProcedure
        .input(zod_1.z.object({ channelId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const threads = await threadService.listChannelThreads(input.channelId);
                return {
                    threads: threads.map(t => t.toJSON()),
                    total: threads.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.threadRouter = threadRouter;
