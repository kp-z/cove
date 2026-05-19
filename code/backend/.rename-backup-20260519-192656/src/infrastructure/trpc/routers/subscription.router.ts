import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';

export interface SubscriptionRouterDependencies {
  eventBus: IEventBus;
}

export function createSubscriptionRouter(deps: SubscriptionRouterDependencies) {
  return router({
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
        ctx.logger.info('Subscription started', {
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
            if (!input.channelId || event.aggregateId === input.channelId || event.payload.channelId === input.channelId) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.info('Subscription ended', {
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
        ctx.logger.info('Subscription started', {
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
            if (!input.channelId || event.payload.channelId === input.channelId) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.info('Subscription ended', {
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
        ctx.logger.info('Subscription started', {
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
            ctx.logger.info('Subscription ended', {
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
        ctx.logger.info('Subscription started', {
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
            if (event.aggregateId === input.channelId || event.payload.channelId === input.channelId) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.info('Subscription ended', {
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
        ctx.logger.info('Subscription started', {
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
            if (event.payload.channelId === input.channelId) {
              emit.next({
                eventId: event.eventId,
                eventType: event.eventType,
                timestamp: event.occurredAt.toISOString(),
                data: event.payload,
              });
            }
          });

          return () => {
            ctx.logger.info('Subscription ended', {
              type: 'onThread',
              channelId: input.channelId,
            });
            unsubscribe();
          };
        });
      }),
  });
}
