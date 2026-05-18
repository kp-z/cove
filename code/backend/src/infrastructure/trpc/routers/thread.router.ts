/**
 * Thread tRPC Router
 *
 * Procedures:
 * - reply: 回复线程
 * - getMessages: 获取线程消息
 * - getMetadata: 获取线程元数据
 * - listByChannel: 获取频道线程列表
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { ThreadService } from '../../../application/services/thread/thread.service';
import { ServerContext } from '../../../application/context/server-context';

// Zod Schemas
const replyInThreadSchema = z.object({
  threadId: z.string(),
  senderId: z.string(),
  senderType: z.enum(['human', 'agent']).optional().default('human'),
  content: z.string().min(1),
});

export const threadRouter = (threadService: ThreadService) =>
  router({
    // 回复线程
    reply: publicProcedure
      .input(replyInThreadSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const message = await threadService.replyInThread(
            input.threadId,
            input.senderId,
            input.senderType,
            input.content,
            context
          );
          return message.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取线程消息
    getMessages: publicProcedure
      .input(z.object({
        threadId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const messages = await threadService.listThreadMessages(
            input.threadId,
            input.cursor,
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

    // 获取线程元数据
    getMetadata: publicProcedure
      .input(z.object({ threadId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const thread = await threadService.getOrCreateThread(input.threadId, context);
          return thread.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取频道线程列表
    listByChannel: publicProcedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const threads = await threadService.listChannelThreads(input.channelId, context);

          return {
            threads: threads.map(t => t.toJSON()),
            total: threads.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
