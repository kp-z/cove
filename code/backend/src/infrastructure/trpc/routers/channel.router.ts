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
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { ChannelService } from '../../../application/services/channel/channel.service';

// Zod Schemas
const createChannelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['public', 'private', 'dm']),
  projectId: z.string().optional(),
  createdBy: z.string(),
  memberIds: z.array(z.string()).readonly().optional(),
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
    list: publicProcedure
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
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch channels',
          });
        }
      }),

    // 获取频道详情
    getById: publicProcedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input }) => {
        try {
          const channel = await channelService.getChannelById(input.channelId);
          return channel.toJSON();
        } catch (error: any) {
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch channel',
          });
        }
      }),

    // 创建频道
    create: publicProcedure
      .input(createChannelSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.createChannel(input);
          return channel.toJSON();
        } catch (error: any) {
          if (error.message?.includes('already exists')) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to create channel',
          });
        }
      }),

    // 更新频道
    update: publicProcedure
      .input(z.object({
        channelId: z.string(),
        data: updateChannelSchema,
      }))
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.updateChannel(input.channelId, input.data);
          return channel.toJSON();
        } catch (error: any) {
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to update channel',
          });
        }
      }),

    // 删除频道
    delete: publicProcedure
      .input(z.object({ channelId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await channelService.deleteChannel(input.channelId);
          return { channelId: input.channelId, deleted: true };
        } catch (error: any) {
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to delete channel',
          });
        }
      }),

    // 获取频道成员
    getMembers: publicProcedure
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
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch members',
          });
        }
      }),

    // 添加成员
    addMember: publicProcedure
      .input(addMemberSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.addMember(input);
          return channel.toJSON();
        } catch (error: any) {
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          if (error.message?.includes('already exists')) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to add member',
          });
        }
      }),

    // 移除成员
    removeMember: publicProcedure
      .input(removeMemberSchema)
      .mutation(async ({ input }) => {
        try {
          const channel = await channelService.removeMember(input);
          return channel.toJSON();
        } catch (error: any) {
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to remove member',
          });
        }
      }),

    // 获取频道的 Agent Pool
    getAgents: publicProcedure
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
          if (error.message?.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to fetch agents',
          });
        }
      }),
  });
