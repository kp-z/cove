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
import { bareChannelId } from '../../../common/channel-ref';

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

/**
 * 契约3：将消息的 sender_type 映射为 LLM 对话历史的 role。
 *
 * @param senderType 消息发送者类型（human / agent / system 等）
 * @returns 对应 LLM role；无法映射（如 system/未知）返回 null，由调用方过滤
 */
function mapSenderTypeToRole(senderType: unknown): 'user' | 'assistant' | null {
  switch (senderType) {
    case 'human':
    case 'user':
      return 'user';
    case 'agent':
    case 'assistant':
      return 'assistant';
    default:
      return null;
  }
}

export const messageRouter = (messageService: MessageService, channelService?: any, eventBus?: IEventBus) =>
  router({
    // 发送消息
    send: publicProcedure
      .input(sendMessageSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const message = await messageService.sendMessage(input);
            return message.toJSON();
          });
        } catch (error: any) {
          ctx.logger.error('Failed to send message', error as Error, {
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
            // 契约3：统一通过 bareChannelId 去除 realm 前缀（消除散落的 split(':')）
            const channelId = bareChannelId(input.channelId);

            const messages = await messageService.getMessagesByChannel(channelId, input.limit, 0);

            // 契约3：在服务端完成 sender_type → role 映射，直接返回对消费者（Local/LLM）
            // 友好的 { role, content } 结构，避免各消费者各自猜测 sender_type 语义。
            // - human → user，agent → assistant
            // - system 及未知类型不进入对话历史（其上下文应通过 systemPrompt 注入）
            return messages.reduce<Array<{ role: 'user' | 'assistant'; content: string }>>((acc, m) => {
              const json = m.toJSON();
              const role = mapSenderTypeToRole(json.sender_type);
              if (role && typeof json.content === 'string' && json.content.length > 0) {
                acc.push({ role, content: json.content });
              }
              return acc;
            }, []);
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
        // 契约2：类型化进度信封 { phase, data }
        phase: z.enum(['thinking', 'tool', 'content', 'status', 'usage']),
        data: z.record(z.unknown()),
      }))
      .mutation(async ({ input }) => {
        if (!eventBus) {
          return { success: true };
        }

        // 契约3：事件 payload 统一使用裸 channelId（Local 入参可能带 realm 前缀）
        const channelId = bareChannelId(input.channelId);
        const basePayload = {
          messageId: input.messageId,
          channelId,
          agentId: input.agentId,
        };

        // 契约2：按 phase 扇出到不同的 agent.response.* 事件，
        // 让前端各 handler 由真实事件驱动，从根上避免把结构化数据当正文渲染。
        const fanOut = (eventType: string, payload: Record<string, unknown>) =>
          eventBus.publish({
            eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            eventType,
            aggregateId: input.messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload,
          });

        try {
          switch (input.phase) {
            case 'thinking':
              await fanOut('agent.response.thinking', {
                ...basePayload,
                thinking: (input.data as any).text ?? '',
              });
              break;

            case 'tool':
              await fanOut('agent.response.tool_use', {
                ...basePayload,
                tool: input.data,
              });
              break;

            case 'content':
              await fanOut('agent.response.streaming', {
                ...basePayload,
                chunk: (input.data as any).chunk ?? '',
              });
              break;

            // 实时反馈：status 相位扇出独立事件，让前端即便面对批量适配器
            // （如 Claude CLI）也能展示"思考中"等活跃状态。
            // 注意：Cloud 完全适配器无关，仅原样中继 Local 上报的统一 status，
            //       不做任何按适配器分支的处理。
            case 'status':
              await fanOut('agent.response.status', {
                ...basePayload,
                status: (input.data as any).status,
              });
              break;

            // usage 仅为元数据相位：不渲染为正文，
            // 最终用量在 saveResponse 落库时统一收口，无需扇出独立事件。
            case 'usage':
            default:
              break;
          }
        } catch (error) {
          console.error('[pushChunk] Failed to publish progress event:', error);
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
            cacheHitRate: z.number().optional(),
            cost: z.object({
              inputCost: z.number().optional(),
              outputCost: z.number().optional(),
              cacheCost: z.number().optional(),
              totalCost: z.number().optional(),
            }).optional(),
            model: z.string().optional(),
            latency: z.object({
              firstTokenMs: z.number().optional(),
              totalMs: z.number().optional(),
              tokensPerSecond: z.number().optional(),
            }).optional(),
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
            // 契约3：统一通过 bareChannelId 去除 realm 前缀（消除散落的 split(':')）
            const channelId = bareChannelId(input.channelId);

            // Get senderId from channel's agentPool if not provided or if it's 'system'
            let senderId = input.senderId;
            if ((!senderId || senderId === 'system') && channelService) {
              try {
                const channel = await channelService.getChannelById(channelId);

                // agentPool might be already parsed as array or a JSON string
                let agentPool: string[] = [];
                if (Array.isArray(channel.agentPool)) {
                  agentPool = channel.agentPool;
                } else if (typeof channel.agentPool === 'string') {
                  try {
                    agentPool = JSON.parse(channel.agentPool);
                  } catch (parseErr) {
                    ctx.logger.warn('Failed to parse channel agentPool', {
                      channelId,
                      error: (parseErr as Error).message,
                    });
                  }
                }

                if (agentPool.length > 0) {
                  senderId = agentPool[0];
                }

                // If still no senderId, use channelId as fallback
                if (!senderId || senderId === 'system') {
                  senderId = channelId;
                }
              } catch (err) {
                ctx.logger.warn('saveResponse: failed to resolve channel sender', {
                  channelId,
                  error: (err as Error).message,
                });
                senderId = channelId;
              }
            }
            if (!senderId) {
              senderId = channelId;
            }

            // 转换 execution 数据为 agentExecutionMetadata 格式
            //
            // 契约：Local 上传的 execution 结构（camelCase，见 backend saveResponse 的 zod schema）
            // 必须转换为 MessageEntity/message.types.ts 期望的 snake_case 结构，
            // 否则 toJSON() 读取 usage.input_tokens 等字段时会因为实际字段名是 inputTokens
            // 而永远得到 undefined —— 序列化后字段被丢弃，前端归一化统一 fallback 成 0，
            // 表现为"token 消耗恒为 0"（历史 bug，此处修复）。
            const usage = input.execution?.usage;
            const cache = (usage?.cacheReadTokens !== undefined || usage?.cacheCreationTokens !== undefined)
              ? {
                  creation_tokens: usage?.cacheCreationTokens ?? 0,
                  read_tokens: usage?.cacheReadTokens ?? 0,
                  hit_rate: usage?.cacheHitRate,
                }
              : undefined;
            const cost = usage?.cost
              ? {
                  input_cost: usage.cost.inputCost ?? 0,
                  output_cost: usage.cost.outputCost ?? 0,
                  cache_cost: usage.cost.cacheCost ?? 0,
                  total_cost: usage.cost.totalCost ?? 0,
                }
              : undefined;
            const latency = usage?.latency
              ? {
                  first_token_ms: usage.latency.firstTokenMs,
                  total_ms: usage.latency.totalMs,
                  tokens_per_second: usage.latency.tokensPerSecond,
                }
              : undefined;

            // execution_mode 依据实际使用的 adapter 名称推导（而非硬编码 'CLI'）：
            // Local 端 claude-cli 系 adapter 上报的 adapter.name 含 'cli'，其余（anthropic/openai）视为 API 调用。
            const adapterName = input.execution?.adapter?.name ?? '';
            const executionMode = adapterName.toLowerCase().includes('cli') ? 'CLI' as const : 'API' as const;

            const agentExecutionMetadata = input.execution ? {
              thinking: input.execution.thinking?.content,
              tool_logs: input.execution.toolUse?.logs.map(log => ({
                id: log.id,
                timestamp: log.startedAt,
                tool_name: log.toolName,
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
              usage: usage ? {
                input_tokens: usage.inputTokens ?? 0,
                output_tokens: usage.outputTokens ?? 0,
                total_tokens: usage.totalTokens ?? 0,
                cache,
                cost,
                model: usage.model,
                latency,
              } : undefined,
              execution_mode: executionMode,
              streaming_status: 'completed' as const,
            } : undefined;

            const message = await messageService.sendMessage({
              senderId,
              senderType: 'agent',
              channelId, // Use the parsed channelId without realm prefix
              content: input.content,
              agentExecutionMetadata,
              // 契约1：沿用 Local 回传的权威 agentMessageId 落库，
              // 使其与前端占位、流式事件中的 messageId 完全一致（幂等）。
              messageId: input.messageId,
              // Don't set threadId - agent responses should appear in main chat flow
              // threadId: input.inReplyTo || input.messageId,
            });

            // 契约2：落库成功后发布 agent.response.completed 生命周期事件，
            // 让前端占位消息从 streaming 收敛为完成态（messageId 与占位 id 一致）。
            //
            // 方案A（自给自足，消除 refetch 竞态）：completed 事件直接携带刚落库的
            // 权威消息（message.toJSON()，与 message.list 返回结构一致）。
            // 前端在 completed 时可直接把正文写入「单一真相源」（serverMessages），
            // 正文即刻原地显示，完全不依赖后续 message.list 的重新拉取（refetch），
            // 从根上消除「completed 抢跑在正文落库之前 / refetch 被去重」的竞态。
            // 随后真正的 message.list 落库结果到达时，因共享同一 messageId 自然覆盖一致，
            // 既不重复也不闪烁。
            if (eventBus) {
              try {
                await eventBus.publish({
                  eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  eventType: 'agent.response.completed',
                  aggregateId: message.messageId,
                  aggregateType: 'Message',
                  occurredAt: new Date(),
                  payload: {
                    messageId: message.messageId,
                    channelId, // 裸 channelId
                    agentId: senderId,
                    // 方案A：随事件下发权威正文 + 全量 metadata（snake_case，
                    // 与 message.list 一致），供前端 Message.fromRemote 直接落地。
                    message: message.toJSON(),
                  },
                });
                // 可观测性：以 agentMessageId(=message.messageId) 为 correlation id
                ctx.logger.info('Agent response completed', {
                  agentMessageId: message.messageId,
                  channelId,
                  agentId: senderId,
                });
              } catch (publishErr) {
                ctx.logger.warn('Failed to publish agent.response.completed', {
                  messageId: message.messageId,
                  error: (publishErr as Error).message,
                });
              }
            }

            return message.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 契约2：Local 处理失败时上报，发布 agent.response.failed 生命周期事件。
    // 使前端占位消息能正确进入失败态（而非 30s 超时误判）。
    reportFailure: publicProcedure
      .input(z.object({
        channelId: z.string(),
        messageId: z.string(), // 服务端预分配的权威 agentMessageId
        agentId: z.string().optional(),
        error: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (eventBus) {
          try {
            await eventBus.publish({
              eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              eventType: 'agent.response.failed',
              aggregateId: input.messageId,
              aggregateType: 'Message',
              occurredAt: new Date(),
              payload: {
                messageId: input.messageId,
                channelId: bareChannelId(input.channelId), // 裸 channelId
                agentId: input.agentId,
                error: input.error,
              },
            });
          } catch (publishErr) {
            console.error('[reportFailure] Failed to publish failed event:', publishErr);
          }
        }
        return { success: true };
      }),
  });
