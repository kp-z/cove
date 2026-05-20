"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const deviceSpecsSchema = zod_1.z.object({
    cpu_cores: zod_1.z.number().int().positive(),
    memory_gb: zod_1.z.number().positive(),
    storage_gb: zod_1.z.number().positive(),
    gpu_count: zod_1.z.number().int().nonnegative().optional(),
    gpu_model: zod_1.z.string().optional(),
});
const deviceNetworkSchema = zod_1.z.object({
    hostname: zod_1.z.string().optional(),
    ip_address: zod_1.z.string().optional(),
    port: zod_1.z.number().int().positive().optional(),
    protocol: zod_1.z.enum(['http', 'https']).optional(),
    domain: zod_1.z.string().optional(),
});
const deviceLocationSchema = zod_1.z.object({
    datacenter: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    zone: zod_1.z.string().optional(),
    rack: zod_1.z.string().optional(),
});
const registerDeviceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    displayName: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['physical', 'virtual', 'container', 'cloud']),
    provider: zod_1.z.string().optional(),
    specs: deviceSpecsSchema,
    network: deviceNetworkSchema.optional(),
    location: deviceLocationSchema.optional(),
});
const updateDeviceSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['provisioning', 'online', 'offline', 'maintenance', 'error', 'decommissioned']).optional(),
    specs: deviceSpecsSchema.optional(),
    network: deviceNetworkSchema.optional(),
    location: deviceLocationSchema.optional(),
    meta: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const deviceRouter = (deviceService) => (0, trpc_1.router)({
    // 注册设备
    register: trpc_1.publicProcedure
        .input(registerDeviceSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const realmId = ctx.realmId || 'default-server';
            const context = realm_context_1.RealmContext.create(realmId, ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const device = await deviceService.createDevice({
                    ...input,
                    realmId
                });
                return device.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取设备列表
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({
        status: zod_1.z.enum(['provisioning', 'online', 'offline', 'maintenance', 'error', 'decommissioned']).optional(),
    }).optional())
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                let devices;
                if (input?.status) {
                    devices = await deviceService.getDevicesByStatus(input.status);
                }
                else {
                    devices = await deviceService.getDevicesByServer(context.realmId);
                }
                return {
                    devices: devices.map((d) => d.toJSON()),
                    total: devices.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个设备
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ deviceId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const device = await deviceService.getDeviceById(input.deviceId);
                return device.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新设备
    update: trpc_1.publicProcedure
        .input(zod_1.z.object({
        deviceId: zod_1.z.string(),
        data: updateDeviceSchema,
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const device = await deviceService.updateDevice(input.deviceId, input.data);
                return device.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除设备
    delete: trpc_1.publicProcedure
        .input(zod_1.z.object({ deviceId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await deviceService.deleteDevice(input.deviceId);
                return { success: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.deviceRouter = deviceRouter;
