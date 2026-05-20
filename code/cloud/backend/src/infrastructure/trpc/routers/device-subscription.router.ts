/**
 * Device WebSocket Subscription Router
 *
 * 提供 Cloud Backend 与 Local Device 之间的实时通信
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';
import type { DeviceConnectionManager } from '../../websocket/device-connection-manager';
import type { ILogger } from '../../../application/interfaces/logger.interface';

export interface DeviceSubscriptionRouterDependencies {
  eventBus: IEventBus;
  deviceConnectionManager: DeviceConnectionManager;
  logger: ILogger;
}

export function createDeviceSubscriptionRouter(deps: DeviceSubscriptionRouterDependencies): ReturnType<typeof router> {
  const deviceSubscriptionRouter = router({
    /**
     * Device 连接并订阅来自 Cloud 的消息
     */
    connect: publicProcedure
      .input(
        z.object({
          deviceId: z.string(),
          apiKey: z.string().optional(),
          metadata: z.record(z.unknown()).optional(),
        })
      )
      .subscription(({ input, ctx }) => {
        const { deviceId, metadata } = input;

        deps.logger.info('Device connecting via WebSocket', {
          deviceId,
          userId: ctx.userId,
        });

        return observable<any>((emit) => {
          // 注册设备连接
          deps.deviceConnectionManager.registerConnection(
            deviceId,
            (_event: string, data: any) => emit.next(data),
            metadata
          );

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
    heartbeat: publicProcedure
      .input(
        z.object({
          deviceId: z.string(),
          status: z.object({
            cpu: z.number().optional(),
            memory: z.number().optional(),
            disk: z.number().optional(),
          }).optional(),
        })
      )
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
    reportTaskResult: publicProcedure
      .input(
        z.object({
          deviceId: z.string(),
          taskId: z.string(),
          status: z.enum(['success', 'error', 'timeout']),
          result: z.record(z.unknown()).optional(),
          error: z.string().optional(),
        })
      )
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
    getOnlineDevices: publicProcedure.query(() => {
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
    isDeviceOnline: publicProcedure
      .input(z.object({ deviceId: z.string() }))
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
