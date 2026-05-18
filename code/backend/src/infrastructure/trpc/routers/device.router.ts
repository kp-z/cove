/**
 * Device tRPC Router
 *
 * Procedures:
 * - register: 注册设备
 * - list: 获取设备列表
 * - getById: 获取单个设备
 * - update: 更新设备
 * - markOnline: 标记设备在线
 * - markOffline: 标记设备离线
 * - markMaintenance: 标记设备维护中
 * - decommission: 停用设备
 * - delete: 删除设备
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { DeviceService } from '../../../application/services/device/device.service';
import { ServerContext } from '../../../application/context/server-context';
import { runWithContext } from '../../../application/context/server-context-store';

// Zod Schemas
const deviceSpecsSchema = z.object({
  cpu_cores: z.number().int().positive(),
  memory_gb: z.number().positive(),
  storage_gb: z.number().positive(),
  gpu_count: z.number().int().nonnegative().optional(),
  gpu_model: z.string().optional(),
});

const deviceNetworkSchema = z.object({
  hostname: z.string().optional(),
  ip_address: z.string().optional(),
  port: z.number().int().positive().optional(),
  protocol: z.enum(['http', 'https']).optional(),
  domain: z.string().optional(),
});

const deviceLocationSchema = z.object({
  datacenter: z.string().optional(),
  region: z.string().optional(),
  zone: z.string().optional(),
  rack: z.string().optional(),
});

const registerDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(['physical', 'virtual', 'container', 'cloud']),
  provider: z.string().optional(),
  specs: deviceSpecsSchema,
  network: deviceNetworkSchema.optional(),
  location: deviceLocationSchema.optional(),
});

const updateDeviceSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  specs: deviceSpecsSchema.optional(),
  network: deviceNetworkSchema.optional(),
  location: deviceLocationSchema.optional(),
  meta: z.record(z.unknown()).optional(),
});

export const deviceRouter = (deviceService: DeviceService) =>
  router({
    // 注册设备
    register: publicProcedure
      .input(registerDeviceSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.registerDevice(input);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取设备列表
    list: publicProcedure
      .input(z.object({
        status: z.enum(['provisioning', 'online', 'offline', 'maintenance', 'error', 'decommissioned']).optional(),
        type: z.enum(['physical', 'virtual', 'container', 'cloud']).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            let devices;
            if (input?.status) {
              devices = await deviceService.getDevicesByStatus(input.status);
            } else if (input?.type) {
              devices = await deviceService.getDevicesByType(input.type);
            } else {
              devices = await deviceService.getDevicesByServer();
            }

            return {
              devices: devices.map(d => d.toJSON()),
              total: devices.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个设备
    getById: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.getDeviceById(input.deviceId);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新设备
    update: publicProcedure
      .input(z.object({
        deviceId: z.string(),
        data: updateDeviceSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.updateDevice(input.deviceId, input.data);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 标记设备在线
    markOnline: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.markOnline(input.deviceId);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 标记设备离线
    markOffline: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.markOffline(input.deviceId);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 标记设备维护中
    markMaintenance: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.markMaintenance(input.deviceId);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 停用设备
    decommission: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.decommissionDevice(input.deviceId);
            return device.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除设备
    delete: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await deviceService.deleteDevice(input.deviceId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
