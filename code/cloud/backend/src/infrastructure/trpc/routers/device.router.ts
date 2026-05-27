/**
 * Device tRPC Router
 *
 * Procedures:
 * - register: 注册设备
 * - list: 获取设备列表
 * - getById: 获取单个设备
 * - update: 更新设备（支持 status 字段更新）
 * - delete: 删除设备
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { DeviceService } from '../../../application/services/device/device.service';
import { DeviceAuthService } from '../../../application/services/device/device-auth.service';
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';

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
  status: z.enum(['provisioning', 'online', 'offline', 'maintenance', 'error', 'decommissioned']).optional(),
  specs: deviceSpecsSchema.optional(),
  network: deviceNetworkSchema.optional(),
  location: deviceLocationSchema.optional(),
  meta: z.record(z.unknown()).optional(),
});

export const deviceRouter = (deviceService: DeviceService, deviceAuthService: DeviceAuthService) =>
  router({
    /**
     * @deprecated Use realm.createWithDevice instead
     * This API will be removed in a future version
     */
    registerLocalDevice: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        type: z.string().default('local'),
        metadata: z.record(z.unknown()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.warn('[DEPRECATED] registerLocalDevice is deprecated. Use realm.createWithDevice instead.');
        try {
          const realmId = ctx.realmId || 'realm-nexus';
          const context = RealmContext.create(realmId, 'system');

          return await runWithContext(context, async () => {
            // 处理设备名称冲突
            const existingDevices = await deviceService.getDevicesByServer(realmId);
            const existingCount = existingDevices.filter(d =>
              d.name.startsWith(input.name)
            ).length;

            const uniqueName = existingCount > 0
              ? `${input.name}-${existingCount + 1}`
              : input.name;

            // 创建设备
            const device = await deviceService.createDevice({
              name: uniqueName,
              displayName: uniqueName,
              description: `Local device: ${uniqueName}`,
              type: 'virtual', // 使用 virtual 类型
              provider: 'local',
              specs: {
                cpu_cores: 1,
                memory_gb: 1,
                storage_gb: 1,
              },
              realmId,
            });

            // 生成 API Key
            const apiKey = await deviceAuthService.generateApiKey(device.device_id, realmId);

            // 开发环境自动激活
            if (process.env.NODE_ENV === 'development') {
              await deviceService.updateDevice(device.device_id, { status: 'online' });
            }

            return {
              deviceId: device.device_id,
              apiKey, // ⚠️ 只返回一次
              name: device.name,
              realmId: device.realm_id,
              message: process.env.NODE_ENV === 'development'
                ? 'Device registered and auto-activated (dev mode)'
                : 'Device registered successfully',
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 撤销设备 API Key
    revokeDevice: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const realmId = ctx.realmId || 'realm-nexus';
          const context = RealmContext.create(realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await deviceAuthService.revokeApiKey(input.deviceId, realmId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    /**
     * @deprecated Use realm.createWithDevice instead
     * This API will be removed in a future version
     */
    generateStartCommand: publicProcedure
      .input(z.object({
        realmId: z.string(),
        deviceName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.warn('[DEPRECATED] generateStartCommand is deprecated. Use realm.createWithDevice instead.');
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            // 创建新设备
            const deviceName = input.deviceName || `device-${Date.now()}`;
            const device = await deviceService.createDevice({
              name: deviceName,
              displayName: deviceName,
              type: 'virtual',
              provider: 'local',
              specs: {
                cpu_cores: 1,
                memory_gb: 1,
                storage_gb: 1,
              },
              realmId: input.realmId,
            });

            // 生成 API Key
            const apiKey = await deviceAuthService.generateApiKey(device.device_id, input.realmId);

            // 生成启动命令
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3002';
            const command = `npx @cove/local-device --server ${serverUrl} --device-id ${device.device_id} --api-key ${apiKey} --realm-id ${input.realmId}`;

            return {
              deviceId: device.device_id,
              apiKey,
              command,
              message: 'Device created. Use the command below to start the local device agent.',
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 注册设备
    register: publicProcedure
      .input(registerDeviceSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const realmId = ctx.realmId || 'default-server';
          const context = RealmContext.create(realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.createDevice({
              ...input,
              realmId
            });
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
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            let devices;
            if (input?.status) {
              devices = await deviceService.getDevicesByStatus(input.status);
            } else {
              devices = await deviceService.getDevicesByServer(context.realmId);
            }

            return {
              devices: devices.map((d: any) => d.toJSON()),
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
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
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
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const device = await deviceService.updateDevice(input.deviceId, input.data);
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
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await deviceService.deleteDevice(input.deviceId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
