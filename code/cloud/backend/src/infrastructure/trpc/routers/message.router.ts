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
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';

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

export const messageRouter = (messageService: MessageService, channelService?: any, eventBus?: IEventBus) =>
  router({
    // 发送消息
    send: publicProcedure
      .input(sendMessageSchema)
      .mutation(async ({ input, ctx }) => {
        console.log('[message.router] send endpoint called', {
          channelId: input.channelId,
          senderId: input.senderId,
          realmId: ctx.realmId,
          userId: ctx.userId,
        });
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.sendMessage(input);
            console.log('[message.router] Message sent successfully', {
              messageId: message.messageId,
            });
          return message.toJSON();
          });
        } catch (error: any) {
          console.error('[message.router] Error sending message', {
            error: error.message,
            channelId: input.channelId,
          });
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
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const result = await messageService.getMessagesByChannelCursor(
            input.channelId,
            input.cursor || null,
            input.limit);

          return {
            messages: result.messages.map(m => m.toJSON()),
            nextCursor: result.nextCursor,
          };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取频道最后一条消息（用于频道列表预览）
    getLastByChannel: publicProcedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.getLastMessageByChannel(input.channelId);
            return message ? message.toJSON() : null;
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单条消息
    getById: publicProcedure
      .input(z.object({ messageId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.getMessageById(input.messageId);
          return message.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新消息
    update: publicProcedure
      .input(updateMessageSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.updateMessage(input);
            return message.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除消息
    delete: publicProcedure
      .input(deleteMessageSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await messageService.deleteMessage(input);
          return { messageId: input.messageId, deleted: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 添加反应
    addReaction: publicProcedure
      .input(reactionSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.addReaction(input);
          return message.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 移除反应
    removeReaction: publicProcedure
      .input(reactionSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.removeReaction(input);
          return message.toJSON();
          });
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
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const messages = await messageService.getMessagesByThread(
            input.messageId,
            input.limit);

          return {
            messages: messages.map(m => m.toJSON()),
            total: messages.length,
          };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 回复线程
    replyToThread: publicProcedure
      .input(replyToThreadSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
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
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Get message history for a channel
    getHistory: publicProcedure
      .input(z.object({
        channelId: z.string(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            // Extract channel ID (remove realm prefix if present)
            const channelId = input.channelId.includes(':')
              ? input.channelId.split(':')[1]
              : input.channelId;

            const messages = await messageService.getMessagesByChannel(channelId, input.limit, 0);
            return messages.map(m => m.toJSON());
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Push a chunk of agent response (for streaming)
    pushChunk: publicProcedure
      .input(z.object({
        channelId: z.string(),
        messageId: z.string(),
        agentId: z.string(),
        chunk: z.string(),
      }))
      .mutation(async ({ input }) => {
        // 发布流式内容事件
        if (eventBus) {
          try {
            await eventBus.publish({
              eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              eventType: 'agent.response.streaming',
              aggregateId: input.messageId,
              aggregateType: 'Message',
              occurredAt: new Date(),
              payload: {
                messageId: input.messageId,
                channelId: input.channelId,
                agentId: input.agentId,
                chunk: input.chunk,
              },
            });
          } catch (error) {
            console.error('[pushChunk] Failed to publish streaming event:', error);
          }
        }
        return { success: true };
      }),

    // Save agent response
    saveResponse: publicProcedure
      .input(z.object({
        channelId: z.string(),
        senderId: z.string().optional(),
        content: z.string(),
        inReplyTo: z.string().optional(),
        messageId: z.string().optional(),
        metadata: z.record(z.unknown()).optional(), // 保持向后兼容
        // 新增：结构化的 execution metadata
        execution: z.object({
          thinking: z.object({
            content: z.string(),
            chunks: z.number(),
            firstTokenMs: z.number().optional(),
            totalMs: z.number().optional(),
          }).optional(),
          toolUse: z.object({
            logs: z.array(z.object({
              id: z.string(),
              toolName: z.string(),
              action: z.string(),
              status: z.enum(['pending', 'running', 'success', 'error']),
              startedAt: z.string(),
              completedAt: z.string().optional(),
              durationMs: z.number().optional(),
              input: z.record(z.unknown()).optional(),
              output: z.record(z.unknown()).optional(),
              error: z.string().optional(),
            })),
            totalTools: z.number(),
            successCount: z.number(),
            errorCount: z.number(),
          }).optional(),
          streaming: z.object({
            totalChunks: z.number(),
            firstChunkMs: z.number().optional(),
            totalMs: z.number().optional(),
            chunkSizes: z.array(z.number()).optional(),
          }).optional(),
          performance: z.object({
            totalDurationMs: z.number(),
            thinkingMs: z.number().optional(),
            toolUseMs: z.number().optional(),
            streamingMs: z.number().optional(),
            networkMs: z.number().optional(),
          }).optional(),
          usage: z.object({
            inputTokens: z.number().optional(),
            outputTokens: z.number().optional(),
            totalTokens: z.number().optional(),
            cacheReadTokens: z.number().optional(),
            cacheCreationTokens: z.number().optional(),
          }).optional(),
          adapter: z.object({
            name: z.string(),
            version: z.string().optional(),
            model: z.string().optional(),
            temperature: z.number().optional(),
          }).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            // Extract channel ID (remove realm prefix if present)
            const channelId = input.channelId.includes(':')
              ? input.channelId.split(':')[1]
              : input.channelId;

            console.log('[saveResponse] Input channelId:', input.channelId);
            console.log('[saveResponse] Parsed channelId:', channelId);
            console.log('[saveResponse] Input senderId:', input.senderId);
            console.log('[saveResponse] channelService available:', !!channelService);

            // Get senderId from channel's agentPool if not provided or if it's 'system'
            let senderId = input.senderId;
            if ((!senderId || senderId === 'system') && channelService) {
              try {
                console.log('[saveResponse] Fetching channel...');
                const channel = await channelService.getChannelById(channelId);
                console.log('[saveResponse] Channel agentPool:', channel.agentPool);

                // agentPool might be already parsed as array or a JSON string
                let agentPool: string[] = [];
                if (Array.isArray(channel.agentPool)) {
                  agentPool = channel.agentPool;
                  console.log('[saveResponse] agentPool is already an array:', agentPool);
                } else if (typeof channel.agentPool === 'string') {
                  try {
                    agentPool = JSON.parse(channel.agentPool);
                    console.log('[saveResponse] Parsed agentPool from string:', agentPool);
                  } catch (parseErr) {
                    console.error('[saveResponse] Failed to parse agentPool:', parseErr);
                  }
                }

                if (agentPool.length > 0) {
                  senderId = agentPool[0];
                  console.log('[saveResponse] Using agent from pool:', senderId);
                }

                // If still no senderId, use channelId as fallback
                if (!senderId || senderId === 'system') {
                  senderId = channelId;
                  console.log('[saveResponse] Using channelId as senderId:', senderId);
                }
              } catch (err) {
                console.error('[saveResponse] Failed to get channel:', err);
                senderId = channelId;
              }
            }
            if (!senderId) {
              senderId = channelId;
              console.log('[saveResponse] Ultimate fallback to channelId:', senderId);
            }

            console.log('[saveResponse] Final senderId:', senderId);

            // 转换 execution 数据为 agentExecutionMetadata 格式
            const agentExecutionMetadata = input.execution ? {
              thinking: input.execution.thinking?.content,
              tool_logs: input.execution.toolUse?.logs.map(log => ({
                id: log.id,
                timestamp: log.startedAt,
                toolName: log.toolName,
                action: log.action,
                params: log.input,
                status: log.status,
                duration: log.durationMs,
                result: {
                  success: log.status === 'success' ? 'Success' : undefined,
                  error: log.error,
                  output: log.output ? JSON.stringify(log.output) : undefined,
                },
              })),
              usage: input.execution.usage ? {
                inputTokens: input.execution.usage.inputTokens,
                outputTokens: input.execution.usage.outputTokens,
                totalTokens: input.execution.usage.totalTokens,
                cacheReadTokens: input.execution.usage.cacheReadTokens,
                cacheCreationTokens: input.execution.usage.cacheCreationTokens,
              } : undefined,
              execution_mode: 'CLI' as const,
              streaming_status: 'completed' as const,
            } : undefined;

            const message = await messageService.sendMessage({
              senderId,
              senderType: 'agent',
              channelId, // Use the parsed channelId without realm prefix
              content: input.content,
              agentExecutionMetadata,
              // Don't set threadId - agent responses should appear in main chat flow
              // threadId: input.inReplyTo || input.messageId,
            });
            return message.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
