"use strict";
/**
 * Message tRPC Router
 *
 * Procedures:
 * - send: 发送消息
 * - list: 获取频道消息列表（支持游标分页）
 * - getById: 获取单条消息
 * - update: 更新消息内容
 * - delete: 删除消息
 * - addReaction: 添加反应
 * - removeReaction: 移除反应
 * - getThreadMessages: 获取线程消息
 * - replyToThread: 回复线程
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const mentionSchema = zod_1.z.object({
    mentionType: zod_1.z.enum(['user', 'agent', 'channel', 'task']),
    mentionId: zod_1.z.string(),
    mentionName: zod_1.z.string().optional(),
    mentionPosition: zod_1.z.number().optional(),
});
const sendMessageSchema = zod_1.z.object({
    channelId: zod_1.z.string(),
    senderId: zod_1.z.string(),
    senderType: zod_1.z.enum(['human', 'agent']).optional().default('human'),
    content: zod_1.z.string().min(1),
    threadId: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.string()).readonly().optional(),
    mentions: zod_1.z.array(mentionSchema).readonly().optional(),
});
const updateMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    content: zod_1.z.string().min(1),
    editorId: zod_1.z.string(),
});
const deleteMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    deletedBy: zod_1.z.string(),
});
const reactionSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    userId: zod_1.z.string(),
    emoji: zod_1.z.string(),
});
const replyToThreadSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    senderId: zod_1.z.string(),
    senderType: zod_1.z.enum(['human', 'agent']).optional().default('human'),
    content: zod_1.z.string().min(1),
    attachments: zod_1.z.array(zod_1.z.string()).readonly().optional(),
    mentions: zod_1.z.array(mentionSchema).readonly().optional(),
});
const messageRouter = (messageService) => (0, trpc_1.router)({
    // 发送消息
    send: trpc_1.publicProcedure
        .input(sendMessageSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const message = await messageService.sendMessage(input);
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取频道消息列表
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({
        channelId: zod_1.z.string(),
        limit: zod_1.z.number().min(1).max(100).optional().default(20),
        cursor: zod_1.z.string().optional(),
    }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const result = await messageService.getMessagesByChannelCursor(input.channelId, input.cursor || null, input.limit);
                return {
                    messages: result.messages.map(m => m.toJSON()),
                    nextCursor: result.nextCursor,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单条消息
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ messageId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const message = await messageService.getMessageById(input.messageId);
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新消息
    update: trpc_1.publicProcedure
        .input(updateMessageSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const message = await messageService.updateMessage(input);
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除消息
    delete: trpc_1.publicProcedure
        .input(deleteMessageSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await messageService.deleteMessage(input);
                return { messageId: input.messageId, deleted: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 添加反应
    addReaction: trpc_1.publicProcedure
        .input(reactionSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const message = await messageService.addReaction(input);
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 移除反应
    removeReaction: trpc_1.publicProcedure
        .input(reactionSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const message = await messageService.removeReaction(input);
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取线程消息
    getThreadMessages: trpc_1.publicProcedure
        .input(zod_1.z.object({
        messageId: zod_1.z.string(),
        limit: zod_1.z.number().min(1).max(100).optional(),
    }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const messages = await messageService.getMessagesByThread(input.messageId, input.limit);
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
    // 回复线程
    replyToThread: trpc_1.publicProcedure
        .input(replyToThreadSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                // 获取 thread root 消息以获取 channelId
                const threadRoot = await messageService.getMessageById(input.messageId);
                const message = await messageService.sendMessage({
                    senderId: input.senderId,
                    senderType: input.senderType,
                    channelId: threadRoot.channelId,
                    content: input.content,
                    threadId: input.messageId,
                    attachments: input.attachments,
                    mentions: input.mentions,
                });
                return message.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.messageRouter = messageRouter;
