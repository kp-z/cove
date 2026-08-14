import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';
import { isSameChannel } from '../../../common/channel-ref';

export interface SubscriptionRouterDependencies {
  eventBus: IEventBus;
}

export function createSubscriptionRouter(deps: SubscriptionRouterDependencies): ReturnType<typeof router> {
  const subscriptionRouter = router({
    // 订阅频道消息事件
    onMessage: procedure
      .input(
        z.object({
          channelId: z.string().optional(),
          events: z
            .array(
              z.enum([
                'message.created',
                'message.updated',
                'message.deleted',
              ])
            )
            .optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onMessage',
          channelId: input.channelId,
          userId: ctx.userId,
          events: input.events,
        });

        return observable((emit) => {
          const eventTypes = input.events || [
            'message.created',
            'message.updated',
            'message.deleted',
          ];

          const unsubscribe = deps.eventBus.subscribeMany(eventTypes, (event) => {
            // 过滤：如果指定了 channelId，只发送匹配的事件
            if (!input.channelId || event.aggregateId === input.channelId || isSameChannel(event.payload.channelId, input.channelId)) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onMessage',
              channelId: input.channelId,
            });
            unsubscribe();
          };
        });
      }),

    // 订阅任务事件
    onTask: procedure
      .input(
        z.object({
          channelId: z.string().optional(),
          events: z
            .array(
              z.enum([
                'task.created',
                'task.updated',
                'task.claimed',
                'task.unclaimed',
                'task.status_changed',
              ])
            )
            .optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onTask',
          channelId: input.channelId,
          userId: ctx.userId,
          events: input.events,
        });

        return observable((emit) => {
          const eventTypes = input.events || [
            'task.created',
            'task.updated',
            'task.claimed',
            'task.unclaimed',
            'task.status_changed',
          ];

          const unsubscribe = deps.eventBus.subscribeMany(eventTypes, (event) => {
            // 过滤：如果指定了 channelId，只发送匹配的事件
            if (!input.channelId || isSameChannel(event.payload.channelId, input.channelId)) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onTask',
              channelId: input.channelId,
            });
            unsubscribe();
          };
        });
      }),

    // 订阅 Agent 状态事件
    onAgentStatus: procedure
      .input(
        z.object({
          agentId: z.string().optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onAgentStatus',
          agentId: input.agentId,
          userId: ctx.userId,
        });

        return observable((emit) => {
          const unsubscribe = deps.eventBus.subscribe('agent.status_changed', (event) => {
            // 如果指定了 agentId，只发送匹配的事件
            if (!input.agentId || event.aggregateId === input.agentId) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onAgentStatus',
              agentId: input.agentId,
            });
            unsubscribe();
          };
        });
      }),

    // 订阅频道成员事件
    onChannelMember: procedure
      .input(
        z.object({
          channelId: z.string(),
          events: z
            .array(
              z.enum([
                'channel.member_joined',
                'channel.member_left',
              ])
            )
            .optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onChannelMember',
          channelId: input.channelId,
          userId: ctx.userId,
          events: input.events,
        });

        return observable((emit) => {
          const eventTypes = input.events || [
            'channel.member_joined',
            'channel.member_left',
          ];

          const unsubscribe = deps.eventBus.subscribeMany(eventTypes, (event) => {
            // 过滤：只发送匹配 channelId 的事件
            if (event.aggregateId === input.channelId || isSameChannel(event.payload.channelId, input.channelId)) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onChannelMember',
              channelId: input.channelId,
            });
            unsubscribe();
          };
        });
      }),

    // 订阅线程事件
    onThread: procedure
      .input(
        z.object({
          channelId: z.string(),
          events: z
            .array(
              z.enum([
                'thread.created',
                'thread.updated',
              ])
            )
            .optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onThread',
          channelId: input.channelId,
          userId: ctx.userId,
          events: input.events,
        });

        return observable((emit) => {
          const eventTypes = input.events || [
            'thread.created',
            'thread.updated',
          ];

          const unsubscribe = deps.eventBus.subscribeMany(eventTypes, (event) => {
            // 过滤：只发送匹配 channelId 的事件
            if (isSameChannel(event.payload.channelId, input.channelId)) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onThread',
              channelId: input.channelId,
            });
            unsubscribe();
          };
        });
      }),

    // 订阅消息流式更新
    onMessageStreaming: procedure
      .input(
        z.object({
          messageId: z.string(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onMessageStreaming',
          messageId: input.messageId,
          userId: ctx.userId,
        });

        return observable((emit) => {
          const eventTypes = [
            'message.streaming.thinking',
            'message.streaming.tool_log',
            'message.streaming.usage',
            'message.streaming.status',
          ];

          const unsubscribe = deps.eventBus.subscribeMany(eventTypes, (event) => {
            // 过滤：只发送匹配 messageId 的事件
            if (event.aggregateId === input.messageId) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });

              // 如果状态是 completed 或 error，自动取消订阅
              if (
                event.eventType === 'message.streaming.status' &&
                (event.payload.streamingStatus === 'completed' || event.payload.streamingStatus === 'error')
              ) {
                emit.complete();
              }
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onMessageStreaming',
              messageId: input.messageId,
            });
            unsubscribe();
          };
        });
      }),

    // 订阅 Agent 响应事件
    onAgentResponse: procedure
      .input(
        z.object({
          channelId: z.string(),
          events: z
            .array(
              z.enum([
                'agent.response.accepted',
                'agent.response.thinking',
                'agent.response.tool_use',
                'agent.response.streaming',
                // 实时反馈：status 相位事件，承载 'thinking'|'tool_use'|'responding'|'completed'
                'agent.response.status',
                'agent.response.completed',
                'agent.response.failed',
                'agent.response.aborted',
              ])
            )
            .optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        ctx.logger.debug('Subscription started', {
          type: 'onAgentResponse',
          channelId: input.channelId,
          userId: ctx.userId,
          events: input.events,
        });

        return observable((emit) => {
          const eventTypes = input.events || [
            'agent.response.accepted',
            'agent.response.thinking',
            'agent.response.tool_use',
            'agent.response.streaming',
            // 实时反馈：status 相位事件，承载 'thinking'|'tool_use'|'responding'|'completed'
            'agent.response.status',
            'agent.response.completed',
            'agent.response.failed',
            'agent.response.aborted',
          ];

          const unsubscribe = deps.eventBus.subscribeMany(eventTypes, (event) => {
            // 契约3：归一化比较 channelId。
            // agent.response.* 事件中，accepted/completed/failed 用裸 channelId，
            // 而 streaming（来自 pushChunk）的 channelId 可能带 realm 前缀，
            // 统一按裸 id 比较，避免流式事件被错误过滤丢弃。
            const matched = isSameChannel(event.payload.channelId, input.channelId);
            if (matched) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                // 同时把 payload.channelId 归一化为裸 id 回传，前端始终拿到一致形态
                data: { ...event.payload, channelId: input.channelId },
              });
            }
          });

          return () => {
            ctx.logger.debug('Subscription ended', {
              type: 'onAgentResponse',
              channelId: input.channelId,
            });
            unsubscribe();
          };
        });
      }),
  });

  return subscriptionRouter;
}
