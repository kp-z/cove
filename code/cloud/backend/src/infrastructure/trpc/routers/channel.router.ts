/**
 * Channel tRPC Router
 *
 * Procedures:
 * - list: 获取频道列表（可按 projectId 过滤）
 * - getById: 获取频道详情
 * - create: 创建频道
 * - update: 更新频道
 * - delete: 删除频道
 * - getMembers: 获取频道成员
 * - addMember: 添加成员（需要 operatorId）
 * - removeMember: 移除成员（需要 operatorId）
 * - updateMemberRole: 更新成员角色（需要 operatorId）
 * - transferOwnership: 转让 ownership
 * - getAgents: 获取频道的 Agent Pool
 */

import { z } from 'zod';
import { router, procedure } from '../trpc';
import { ChannelService } from '../../../application/services/channel/channel.service';
import { mapErrorToTRPC } from '../../../common/errors';

// Zod Schemas
const createChannelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['public', 'private', 'dm']),
  projectId: z.string().optional(),
  createdBy: z.string(),
  memberIds: z.array(z.string()).readonly().optional(),
  agentIds: z.array(z.string()).readonly().optional(), // 新增：用于指定 agent 成员
});

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  channelId: z.string(),
  memberId: z.string(),
  memberType: z.enum(['human', 'agent']).optional(),
  operatorId: z.string(),
});

const removeMemberSchema = z.object({
  channelId: z.string(),
  memberId: z.string(),
  operatorId: z.string(),
});

const updateMemberRoleSchema = z.object({
  channelId: z.string(),
  memberId: z.string(),
  newRole: z.enum(['owner', 'admin', 'member']),
  operatorId: z.string(),
});

const transferOwnershipSchema = z.object({
  channelId: z.string(),
  newOwnerId: z.string(),
  currentOwnerId: z.string(),
});

export const channelRouter = (channelService: ChannelService) =>
  router({
    // 获取频道列表
    list: procedure
      .input(z.object({
        projectId: z.string().optional(),
        userId: z.string().optional(), // 添加 userId 参数用于过滤
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          let channels;

          // 优先使用传入的 userId，否则使用 context 中的 userId
          const userId = input?.userId || ctx.userId;

          if (userId) {
            // 如果有 userId，只返回用户参与的 channel
            channels = await channelService.getChannelsByMember(userId);

            // 如果还指定了 projectId，进一步过滤
            if (input?.projectId) {
              channels = channels.filter(c => c.projectId === input.projectId);
            }
          } else if (input?.projectId) {
            channels = await channelService.getChannelsByProject(input.projectId);
          } else {
            channels = await channelService.getAllChannels();
          }

          return {
            channels: channels.map(c => c.toJSON()),
            total: channels.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取频道详情
    getById: procedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input }) => {
        try {
          const channel = await channelService.getChannelById(input.channelId);
          return channel.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 创建频道
    create: procedure
      .input(createChannelSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // 如果是 DM 类型且只有一个 agent，检查是否已存在（幂等性）
          if (input.type === 'dm' && input.agentIds?.length === 1) {
            const agentId = input.agentIds[0];

            if (!agentId) {
              throw new Error('Agent ID is required for DM channel');
            }

            console.log('[INFO] [DEBUG] Checking for existing DM channel', { agentId, userId: ctx.userId });

            // 使用优化的查询方法，直接在数据库层面查找
            const existingDM = await channelService.getAgentDMChannel(agentId);

            console.log('[INFO] [DEBUG] Existing DM channel check result', {
              agentId,
              found: !!existingDM,
              channelId: existingDM?.channelId,
              members: existingDM?.members.map(m => ({ memberId: m.memberId, memberType: m.memberType })),
            });

            // 如果已存在，直接返回（幂等性）
            if (existingDM) {
              console.log('[INFO] [DEBUG] Returning existing DM channel (idempotent)', { channelId: existingDM.channelId });
              return existingDM.toJSON();
            }
          }

          console.log('[INFO] [DEBUG] Creating new channel', { type: input.type, name: input.name });

          // 创建 channel（业务逻辑和验证在 Service 层）
          const channel = await channelService.createChannel(input);

          console.log('[INFO] [DEBUG] Channel created successfully', { channelId: channel.channelId });

          return channel.toJSON();
        } catch (error: any) {
          console.error('[ERROR] Failed to create channel', error);
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新频道
    update: procedure
      .input(z.object({
        channelId: z.string(),
        data: updateChannelSchema,
      }))
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.updateChannel(input.channelId, input.data);
          return channel.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除频道
    delete: procedure
      .input(z.object({ channelId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await channelService.deleteChannel(input.channelId);
          return { channelId: input.channelId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取频道成员
    getMembers: procedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input }) => {
        try {
          const channel = await channelService.getChannelById(input.channelId);
          const members = channel.members;

          return {
            channelId: input.channelId,
            members: members.map(m => ({
              memberId: m.memberId,
              memberType: m.memberType,
              role: m.role,
              joinedAt: m.joinedAt.toISOString(),
            })),
            total: members.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 添加成员
    addMember: procedure
      .input(addMemberSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.addMember(input);
          return channel.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 移除成员
    removeMember: procedure
      .input(removeMemberSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.removeMember(input);
          return channel.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新成员角色
    updateMemberRole: procedure
      .input(updateMemberRoleSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.updateMemberRole(input);
          return channel.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 转让 ownership
    transferOwnership: procedure
      .input(transferOwnershipSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.transferOwnership(input);
          return channel.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取频道的 Agent Pool
    getAgents: procedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input }) => {
        try {
          const channel = await channelService.getChannelById(input.channelId);
          const agentPool = channel.agentPool;

          return {
            channelId: input.channelId,
            agentPool,
            total: agentPool.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
