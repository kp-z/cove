/**
 * Realm tRPC Router
 *
 * Procedures:
 * - create: 创建服务器
 * - list: 获取服务器列表
 * - getById: 获取单个服务器
 * - update: 更新服务器（支持 status 字段更新）
 * - delete: 删除服务器
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { RealmService } from '../../../application/services/realm/realm.service';
import { DeviceService } from '../../../application/services/device/device.service';
import { DeviceAuthService } from '../../../application/services/device/device-auth.service';
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';
import type { UserService } from '../../../application/services/user/user.service';

// Zod Schemas
const createRealmSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  description: z.string().optional(),
  ownerId: z.string(),
  visibility: z.enum(['public', 'private']).optional(),
});

const updateRealmSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
  settings: z.record(z.unknown()).optional(),
  features: z.array(z.string()).optional(),
});

export const realmRouter = (
  realmService: RealmService,
  deviceService?: DeviceService,
  deviceAuthService?: DeviceAuthService,
  userService?: UserService
) =>
  router({
    // 创建服务器
    create: publicProcedure
      .input(createRealmSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await realmService.createRealm(input);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 创建服务器并返回设备信息（推荐使用）
    createWithDevice: publicProcedure
      .input(createRealmSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const result = await realmService.createRealmWithDevice(input);
            return {
              realm: result.realm.toJSON(),
              device: result.device,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取服务器列表
    list: publicProcedure
      .input(z.object({
        ownerId: z.string().optional(),
        status: z.enum(['active', 'archived']).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const servers = await realmService.queryServers(input);

            // Get user's default realm from preferences
            let defaultRealmId: string | undefined;
            if (ctx.userId && userService) {
              try {
                const user = await userService.getUserById(ctx.userId);
                defaultRealmId = user?.preference?.last_accessed_realm_id;
              } catch (error) {
                // Ignore error, just don't set default
              }
            }

            // Enrich realms with device status
            const realmsWithStatus = await Promise.all(
              servers.map(async (realm) => {
                const realmJson = realm.toJSON();
                let deviceStatus: 'online' | 'offline' | 'unknown' = 'unknown';

                if (deviceService) {
                  try {
                    const device = await deviceService.getRealmDevice(realm.realm_id);
                    if (device) {
                      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                      const isOnline = device.last_seen_at && new Date(device.last_seen_at) > fiveMinutesAgo;
                      deviceStatus = isOnline ? 'online' : 'offline';
                    }
                  } catch (error) {
                    // Ignore error, keep as unknown
                  }
                }

                return {
                  ...realmJson,
                  logo_url: realmJson.logo?.url, // 提取 logo URL
                  deviceStatus,
                  isDefault: realm.realm_id === defaultRealmId,
                };
              })
            );

            // Sort: default realm first, then by last accessed
            realmsWithStatus.sort((a, b) => {
              if (a.isDefault) return -1;
              if (b.isDefault) return 1;
              // Sort by created_at descending as fallback
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            return {
              realms: realmsWithStatus,
              total: realmsWithStatus.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个服务器
    getById: publicProcedure
      .input(z.object({ realmId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await realmService.getRealmById(input.realmId);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新服务器
    update: publicProcedure
      .input(z.object({
        realmId: z.string(),
        data: updateRealmSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const server = await realmService.updateRealm(input.realmId, input.data);
            return server.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除服务器
    delete: publicProcedure
      .input(z.object({ realmId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            await realmService.deleteRealm(input.realmId);
            return { success: true };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // ============================================
    // Realm Member Management
    // ============================================

    // 添加成员
    addMember: publicProcedure
      .input(z.object({
        realmId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member', 'guest']),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await realmService.addRealmMember(
              input.realmId,
              input.userId,
              input.role
            );
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新成员
    updateMember: publicProcedure
      .input(z.object({
        realmId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member', 'guest']).optional(),
        status: z.enum(['active', 'suspended', 'left']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await realmService.updateRealmMember(
              input.realmId,
              input.userId,
              { role: input.role, status: input.status }
            );
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取成员列表
    getMembers: publicProcedure
      .input(z.object({
        realmId: z.string(),
        role: z.enum(['owner', 'admin', 'member', 'guest']).optional(),
        status: z.enum(['active', 'suspended', 'left']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const members = await realmService.getRealmMembers(input.realmId, {
              role: input.role,
              status: input.status,
            });
            return {
              members: members.map(m => m.toJSON()),
              total: members.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个成员
    getMember: publicProcedure
      .input(z.object({
        realmId: z.string(),
        userId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const member = await realmService.getServerMember(input.realmId, input.userId);
            if (!member) {
              throw new Error('Member not found');
            }
            return member.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取用户所属的所有 realm
    getUserRealms: publicProcedure
      .input(z.object({
        userId: z.string(),
        status: z.enum(['active', 'archived']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const realms = await realmService.getUserRealms(input.userId, {
              status: input.status,
            });
            return {
              realms: realms.map(r => r.toJSON()),
              total: realms.length,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取用户在 realm 中的角色
    getUserRole: publicProcedure
      .input(z.object({
        realmId: z.string(),
        userId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const role = await realmService.getUserRole(input.realmId, input.userId);
            return {
              role,
              hasAccess: role !== null,
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取设备状态和启动命令
    getDeviceStatus: publicProcedure
      .input(z.object({
        realmId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(input.realmId, ctx.userId || 'system');
          return await runWithContext(context, async () => {
            // Check if device services are available
            if (!deviceService || !deviceAuthService) {
              throw new Error('Device management not available');
            }

            // Get realm device
            const device = await deviceService.getRealmDevice(input.realmId);

            if (!device) {
              return {
                hasDevice: false,
              };
            }

            // Check if device is online (last seen within 5 minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const isOnline = device.last_seen_at && new Date(device.last_seen_at) > fiveMinutesAgo;

            if (isOnline) {
              // Device is online, return status without generating new key
              return {
                hasDevice: true,
                isOnline: true,
                device: {
                  deviceId: device.device_id,
                  name: device.display_name || device.name,
                  status: device.status,
                  lastSeenAt: device.last_seen_at,
                },
              };
            }

            // Device is offline, rotate API key and generate startup command
            const apiKey = await deviceAuthService.rotateApiKey(device.device_id, input.realmId);
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3002';
            const wsUrl = serverUrl.replace(/^http/, 'ws') + '/trpc';

            // Generate simple npx command
            const startCommand = `npx @cove/local-device --server ${wsUrl} --device-id ${device.device_id} --api-key ${apiKey} --realm-id ${input.realmId}`;

            return {
              hasDevice: true,
              isOnline: false,
              device: {
                deviceId: device.device_id,
                name: device.display_name || device.name,
                status: device.status,
                lastSeenAt: device.last_seen_at,
              },
              startCommand,
              apiKey,
              warning: '⚠️ API Key will only be shown once. Please save it securely.',
            };
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
