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
 * - addMember: 添加成员
 * - removeMember: 移除成员
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
});

const removeMemberSchema = z.object({
  channelId: z.string(),
  memberId: z.string(),
});

export const channelRouter = (channelService: ChannelService) =>
  router({
    // 获取频道列表
    list: procedure
      .input(z.object({ projectId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        try {
          let channels;
          if (input?.projectId) {
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
      .mutation(async ({ input }) => {
        try {
          // 如果是 DM 类型且只有一个 agent，检查是否已存在（幂等性）
          if (input.type === 'dm' && input.agentIds?.length === 1) {
            const agentId = input.agentIds[0];

            if (!agentId) {
              throw new Error('Agent ID is required for DM channel');
            }

            // 使用优化的查询方法，直接在数据库层面查找
            const existingDM = await channelService.getAgentDMChannel(agentId);

            // 如果已存在，直接返回（幂等性）
            if (existingDM) {
              return existingDM.toJSON();
            }
          }

          // 创建 channel（业务逻辑和验证在 Service 层）
          const channel = await channelService.createChannel(input);
          return channel.toJSON();
        } catch (error: any) {
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
