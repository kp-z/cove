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

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { MessageService } from '../../../application/services/message/message.service';
import { mapErrorToTRPC } from '../../../common/errors';
import { ServerContext } from '../../../application/context/server-context';

// Zod Schemas
const mentionSchema = z.object({
  mentionType: z.enum(['user', 'agent', 'channel', 'task']),
  mentionId: z.string(),
  mentionName: z.string().optional(),
  mentionPosition: z.number().optional(),
});

const sendMessageSchema = z.object({
  channelId: z.string(),
  senderId: z.string(),
  senderType: z.enum(['human', 'agent']).optional().default('human'),
  content: z.string().min(1),
  threadId: z.string().optional(),
  attachments: z.array(z.string()).readonly().optional(),
  mentions: z.array(mentionSchema).readonly().optional(),
});

const updateMessageSchema = z.object({
  messageId: z.string(),
  content: z.string().min(1),
  editorId: z.string(),
});

const deleteMessageSchema = z.object({
  messageId: z.string(),
  deletedBy: z.string(),
});

const reactionSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  emoji: z.string(),
});

const replyToThreadSchema = z.object({
  messageId: z.string(),
  senderId: z.string(),
  senderType: z.enum(['human', 'agent']).optional().default('human'),
  content: z.string().min(1),
  attachments: z.array(z.string()).readonly().optional(),
  mentions: z.array(mentionSchema).readonly().optional(),
});

export const messageRouter = (messageService: MessageService) =>
  router({
    // 发送消息
    send: publicProcedure
      .input(sendMessageSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const message = await messageService.sendMessage(input, context);
          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取频道消息列表
    list: publicProcedure
      .input(z.object({
        channelId: z.string(),
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const result = await messageService.getMessagesByChannelCursor(
            input.channelId,
            input.cursor || null,
            input.limit,
            context
          );

          return {
            messages: result.messages.map(m => m.toJSON()),
            nextCursor: result.nextCursor,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单条消息
    getById: publicProcedure
      .input(z.object({ messageId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const message = await messageService.getMessageById(input.messageId, context);
          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新消息
    update: publicProcedure
      .input(updateMessageSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const message = await messageService.updateMessage(input, context);
          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除消息
    delete: publicProcedure
      .input(deleteMessageSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          await messageService.deleteMessage(input, context);
          return { messageId: input.messageId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 添加反应
    addReaction: publicProcedure
      .input(reactionSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const message = await messageService.addReaction(input, context);
          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 移除反应
    removeReaction: publicProcedure
      .input(reactionSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const message = await messageService.removeReaction(input, context);
          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取线程消息
    getThreadMessages: publicProcedure
      .input(z.object({
        messageId: z.string(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const messages = await messageService.getMessagesByThread(
            input.messageId,
            input.limit,
            context
          );

          return {
            messages: messages.map(m => m.toJSON()),
            total: messages.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 回复线程
    replyToThread: publicProcedure
      .input(replyToThreadSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          // 获取 thread root 消息以获取 channelId
          const threadRoot = await messageService.getMessageById(input.messageId, context);

          const message = await messageService.sendMessage({
            senderId: input.senderId,
            senderType: input.senderType,
            channelId: threadRoot.channelId,
            content: input.content,
            threadId: input.messageId,
            attachments: input.attachments,
            mentions: input.mentions,
          }, context);

          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
