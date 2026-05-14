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
import { TRPCError } from '@trpc/server';
import { ThreadService } from '../../../application/services/thread/thread.service';

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
      .mutation(async ({ input }) => {
        try {
          const message = await threadService.replyInThread(
            input.threadId,
            input.senderId,
            input.senderType,
            input.content
          );
          return message.toJSON();
        } catch (error: any) {
          if (error.name === 'NestedThreadError') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            });
          }
          if (error.name === 'ThreadNotFoundError' || error.name === 'RootMessageNotFoundError') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to reply in thread',
          });
        }
      }),

    // 获取线程消息
    getMessages: publicProcedure
      .input(z.object({
        threadId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input }) => {
        try {
          const messages = await threadService.listThreadMessages(
            input.threadId,
            input.cursor,
            input.limit
          );

          return {
            messages: messages.map(m => m.toJSON()),
            total: messages.length,
          };
        } catch (error: any) {
          if (error.name === 'ThreadNotFoundError' || error.name === 'RootMessageNotFoundError') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch thread messages',
          });
        }
      }),

    // 获取线程元数据
    getMetadata: publicProcedure
      .input(z.object({ threadId: z.string() }))
      .query(async ({ input }) => {
        try {
          const thread = await threadService.getOrCreateThread(input.threadId);
          return thread.toJSON();
        } catch (error: any) {
          if (error.name === 'ThreadNotFoundError' || error.name === 'RootMessageNotFoundError') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch thread metadata',
          });
        }
      }),

    // 获取频道线程列表
    listByChannel: publicProcedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input }) => {
        try {
          const threads = await threadService.listChannelThreads(input.channelId);

          return {
            threads: threads.map(t => t.toJSON()),
            total: threads.length,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch channel threads',
          });
        }
      }),
  });
