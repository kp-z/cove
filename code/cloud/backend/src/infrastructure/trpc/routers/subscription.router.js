"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscriptionRouter = createSubscriptionRouter;
const zod_1 = require("zod");
const observable_1 = require("@trpc/server/observable");
const trpc_1 = require("../trpc");
function createSubscriptionRouter(deps) {
    const subscriptionRouter = (0, trpc_1.router)({
        // 订阅频道消息事件
        onMessage: trpc_1.procedure
            .input(zod_1.z.object({
            channelId: zod_1.z.string().optional(),
            events: zod_1.z
                .array(zod_1.z.enum([
                'message.created',
                'message.updated',
                'message.deleted',
            ]))
                .optional(),
        }))
            .subscription(({ input, ctx }) => {
            ctx.logger.info('Subscription started', {
                type: 'onMessage',
                channelId: input.channelId,
                userId: ctx.userId,
                events: input.events,
            });
            return (0, observable_1.observable)((emit) => {
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
        onTask: trpc_1.procedure
            .input(zod_1.z.object({
            channelId: zod_1.z.string().optional(),
            events: zod_1.z
                .array(zod_1.z.enum([
                'task.created',
                'task.updated',
                'task.claimed',
                'task.unclaimed',
                'task.status_changed',
            ]))
                .optional(),
        }))
            .subscription(({ input, ctx }) => {
            ctx.logger.info('Subscription started', {
                type: 'onTask',
                channelId: input.channelId,
                userId: ctx.userId,
                events: input.events,
            });
            return (0, observable_1.observable)((emit) => {
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
        onAgentStatus: trpc_1.procedure
            .input(zod_1.z.object({
            agentId: zod_1.z.string().optional(),
        }))
            .subscription(({ input, ctx }) => {
            ctx.logger.info('Subscription started', {
                type: 'onAgentStatus',
                agentId: input.agentId,
                userId: ctx.userId,
            });
            return (0, observable_1.observable)((emit) => {
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
        onChannelMember: trpc_1.procedure
            .input(zod_1.z.object({
            channelId: zod_1.z.string(),
            events: zod_1.z
                .array(zod_1.z.enum([
                'channel.member_joined',
                'channel.member_left',
            ]))
                .optional(),
        }))
            .subscription(({ input, ctx }) => {
            ctx.logger.info('Subscription started', {
                type: 'onChannelMember',
                channelId: input.channelId,
                userId: ctx.userId,
                events: input.events,
            });
            return (0, observable_1.observable)((emit) => {
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
        onThread: trpc_1.procedure
            .input(zod_1.z.object({
            channelId: zod_1.z.string(),
            events: zod_1.z
                .array(zod_1.z.enum([
                'thread.created',
                'thread.updated',
            ]))
                .optional(),
        }))
            .subscription(({ input, ctx }) => {
            ctx.logger.info('Subscription started', {
                type: 'onThread',
                channelId: input.channelId,
                userId: ctx.userId,
                events: input.events,
            });
            return (0, observable_1.observable)((emit) => {
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
    return subscriptionRouter;
}
