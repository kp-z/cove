"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
// Zod Schemas
const createChannelSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['public', 'private', 'dm']),
    projectId: zod_1.z.string().optional(),
    createdBy: zod_1.z.string(),
    memberIds: zod_1.z.array(zod_1.z.string()).readonly().optional(),
});
const updateChannelSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
});
const addMemberSchema = zod_1.z.object({
    channelId: zod_1.z.string(),
    memberId: zod_1.z.string(),
});
const removeMemberSchema = zod_1.z.object({
    channelId: zod_1.z.string(),
    memberId: zod_1.z.string(),
});
const channelRouter = (channelService) => (0, trpc_1.router)({
    // 获取频道列表
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({ projectId: zod_1.z.string().optional() }).optional())
        .query(async ({ input }) => {
        try {
            let channels;
            if (input?.projectId) {
                channels = await channelService.getChannelsByProject(input.projectId);
            }
            else {
                channels = await channelService.getAllChannels();
            }
            return {
                channels: channels.map(c => c.toJSON()),
                total: channels.length,
            };
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取频道详情
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ channelId: zod_1.z.string() }))
        .query(async ({ input }) => {
        try {
            const channel = await channelService.getChannelById(input.channelId);
            return channel.toJSON();
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 创建频道
    create: trpc_1.publicProcedure
        .input(createChannelSchema)
        .mutation(async ({ input }) => {
        try {
            const channel = await channelService.createChannel(input);
            return channel.toJSON();
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新频道
    update: trpc_1.publicProcedure
        .input(zod_1.z.object({
        channelId: zod_1.z.string(),
        data: updateChannelSchema,
    }))
        .mutation(async ({ input }) => {
        try {
            const channel = await channelService.updateChannel(input.channelId, input.data);
            return channel.toJSON();
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除频道
    delete: trpc_1.publicProcedure
        .input(zod_1.z.object({ channelId: zod_1.z.string() }))
        .mutation(async ({ input }) => {
        try {
            await channelService.deleteChannel(input.channelId);
            return { channelId: input.channelId, deleted: true };
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取频道成员
    getMembers: trpc_1.publicProcedure
        .input(zod_1.z.object({ channelId: zod_1.z.string() }))
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
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 添加成员
    addMember: trpc_1.publicProcedure
        .input(addMemberSchema)
        .mutation(async ({ input }) => {
        try {
            const channel = await channelService.addMember(input);
            return channel.toJSON();
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 移除成员
    removeMember: trpc_1.publicProcedure
        .input(removeMemberSchema)
        .mutation(async ({ input }) => {
        try {
            const channel = await channelService.removeMember(input);
            return channel.toJSON();
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取频道的 Agent Pool
    getAgents: trpc_1.publicProcedure
        .input(zod_1.z.object({ channelId: zod_1.z.string() }))
        .query(async ({ input }) => {
        try {
            const channel = await channelService.getChannelById(input.channelId);
            const agentPool = channel.agentPool;
            return {
                channelId: input.channelId,
                agentPool,
                total: agentPool.length,
            };
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.channelRouter = channelRouter;
