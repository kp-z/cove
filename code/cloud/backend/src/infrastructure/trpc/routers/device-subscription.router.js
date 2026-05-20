"use strict";
/**
 * Device WebSocket Subscription Router
 *
 * 提供 Cloud Backend 与 Local Device 之间的实时通信
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeviceSubscriptionRouter = createDeviceSubscriptionRouter;
const zod_1 = require("zod");
const observable_1 = require("@trpc/server/observable");
const trpc_1 = require("../trpc");
function createDeviceSubscriptionRouter(deps) {
    const deviceSubscriptionRouter = (0, trpc_1.router)({
        /**
         * Device 连接并订阅来自 Cloud 的消息
         */
        connect: trpc_1.publicProcedure
            .input(zod_1.z.object({
            deviceId: zod_1.z.string(),
            apiKey: zod_1.z.string().optional(),
            metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
        }))
            .subscription(({ input, ctx }) => {
            const { deviceId, metadata } = input;
            deps.logger.info('Device connecting via WebSocket', {
                deviceId,
                userId: ctx.userId,
            });
            return (0, observable_1.observable)((emit) => {
                // 注册设备连接
                deps.deviceConnectionManager.registerConnection(deviceId, metadata);
                // 发送连接确认
                emit.next({
                    type: 'connected',
                    deviceId,
                    timestamp: new Date().toISOString(),
                });
                // 订阅发送给该设备的任务和命令
                const unsubscribeTask = deps.eventBus.subscribe('device.task.assigned', (event) => {
                    if (event.payload.deviceId === deviceId) {
                        emit.next({
                            type: 'task',
                            data: event.payload,
                            timestamp: event.occurredAt.toISOString(),
                        });
                    }
                });
                const unsubscribeCommand = deps.eventBus.subscribe('device.command.sent', (event) => {
                    if (event.payload.deviceId === deviceId) {
                        emit.next({
                            type: 'command',
                            data: event.payload,
                            timestamp: event.occurredAt.toISOString(),
                        });
                    }
                });
                const unsubscribeConfig = deps.eventBus.subscribe('device.config.updated', (event) => {
                    if (event.payload.deviceId === deviceId) {
                        emit.next({
                            type: 'config',
                            data: event.payload,
                            timestamp: event.occurredAt.toISOString(),
                        });
                    }
                });
                // 清理函数
                return () => {
                    deps.logger.info('Device disconnecting', { deviceId });
                    deps.deviceConnectionManager.unregisterConnection(deviceId);
                    unsubscribeTask();
                    unsubscribeCommand();
                    unsubscribeConfig();
                };
            });
        }),
        /**
         * Device 发送心跳
         */
        heartbeat: trpc_1.publicProcedure
            .input(zod_1.z.object({
            deviceId: zod_1.z.string(),
            status: zod_1.z.object({
                cpu: zod_1.z.number().optional(),
                memory: zod_1.z.number().optional(),
                disk: zod_1.z.number().optional(),
            }).optional(),
        }))
            .mutation(({ input }) => {
            const { deviceId, status } = input;
            deps.deviceConnectionManager.updateHeartbeat(deviceId);
            // 发布心跳事件
            deps.eventBus.publish({
                eventId: crypto.randomUUID(),
                eventType: 'device.heartbeat',
                aggregateId: deviceId,
                aggregateType: 'device',
                occurredAt: new Date(),
                payload: { deviceId, status },
            });
            return {
                success: true,
                timestamp: new Date().toISOString(),
            };
        }),
        /**
         * Device 报告任务结果
         */
        reportTaskResult: trpc_1.publicProcedure
            .input(zod_1.z.object({
            deviceId: zod_1.z.string(),
            taskId: zod_1.z.string(),
            status: zod_1.z.enum(['success', 'error', 'timeout']),
            result: zod_1.z.record(zod_1.z.unknown()).optional(),
            error: zod_1.z.string().optional(),
        }))
            .mutation(({ input }) => {
            const { deviceId, taskId, status, result, error } = input;
            deps.logger.info('Device task result received', {
                deviceId,
                taskId,
                status,
            });
            // 发布任务完成事件
            deps.eventBus.publish({
                eventId: crypto.randomUUID(),
                eventType: 'device.task.completed',
                aggregateId: taskId,
                aggregateType: 'task',
                occurredAt: new Date(),
                payload: {
                    deviceId,
                    taskId,
                    status,
                    result,
                    error,
                },
            });
            return {
                success: true,
                timestamp: new Date().toISOString(),
            };
        }),
        /**
         * 获取在线设备列表
         */
        getOnlineDevices: trpc_1.publicProcedure.query(() => {
            const devices = deps.deviceConnectionManager.getOnlineDevices();
            return {
                devices,
                count: devices.length,
                timestamp: new Date().toISOString(),
            };
        }),
        /**
         * 检查设备是否在线
         */
        isDeviceOnline: trpc_1.publicProcedure
            .input(zod_1.z.object({ deviceId: zod_1.z.string() }))
            .query(({ input }) => {
            const isOnline = deps.deviceConnectionManager.isDeviceOnline(input.deviceId);
            const connection = deps.deviceConnectionManager.getConnection(input.deviceId);
            return {
                deviceId: input.deviceId,
                isOnline,
                connection: connection
                    ? {
                        connectedAt: connection.connectedAt.toISOString(),
                        lastHeartbeat: connection.lastHeartbeat.toISOString(),
                    }
                    : null,
            };
        }),
    });
    return deviceSubscriptionRouter;
}
