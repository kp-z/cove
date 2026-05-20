"use strict";
/**
 * Task tRPC Router
 *
 * Procedures:
 * - create: 创建任务
 * - list: 获取任务列表（支持按 projectId, channelId, status, priority 过滤）
 * - getById: 获取单个任务
 * - update: 更新任务（支持 status 字段更新）
 * - delete: 删除任务
 * - convertMessageToTask: 消息转任务
 * - claim: 认领任务
 * - unclaim: 放弃认领
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const createTaskSchema = zod_1.z.object({
    projectId: zod_1.z.string(),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    taskType: zod_1.z.enum(['single_agent', 'multi_agent', 'workflow']),
    priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3']),
    channelId: zod_1.z.string(),
    krId: zod_1.z.string().optional(),
    dependsOn: zod_1.z.array(zod_1.z.string()).readonly().optional(),
    createdBy: zod_1.z.string(),
});
const updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']).optional(),
    actorId: zod_1.z.string().optional(),
});
const convertMessageToTaskSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    title: zod_1.z.string().min(1),
    createdBy: zod_1.z.string(),
});
const claimTaskSchema = zod_1.z.object({
    taskId: zod_1.z.string(),
    assigneeId: zod_1.z.string(),
    assigneeType: zod_1.z.enum(['human', 'agent']).optional().default('human'),
});
const taskRouter = (taskService) => (0, trpc_1.router)({
    // 创建任务
    create: trpc_1.publicProcedure
        .input(createTaskSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const task = await taskService.createTask(input);
                return task.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取任务列表
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({
        projectId: zod_1.z.string().optional(),
        channelId: zod_1.z.string().optional(),
        status: zod_1.z.enum(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']).optional(),
        priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
    }).optional())
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                let tasks = [];
                if (input?.channelId) {
                    tasks = await taskService.getTasksByChannel(input.channelId);
                }
                else if (input?.status) {
                    tasks = await taskService.getTasksByStatus(input.status);
                }
                else if (input?.priority) {
                    tasks = await taskService.getTasksByPriority(input.priority);
                }
                else if (input?.projectId) {
                    tasks = await taskService.getTasksByProject(input.projectId);
                }
                else {
                    // Default: get all tasks (you may want to add a getAllTasks method)
                    tasks = [];
                }
                return {
                    tasks: tasks.map(t => t.toJSON()),
                    total: tasks.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个任务
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ taskId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const task = await taskService.getTaskById(input.taskId);
                return task.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新任务
    update: trpc_1.publicProcedure
        .input(zod_1.z.object({
        taskId: zod_1.z.string(),
        data: updateTaskSchema,
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const task = await taskService.updateTask(input.taskId, input.data);
                return task.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除任务
    delete: trpc_1.publicProcedure
        .input(zod_1.z.object({ taskId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await taskService.deleteTask(input.taskId);
                return { taskId: input.taskId, deleted: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 消息转任务
    convertMessageToTask: trpc_1.publicProcedure
        .input(convertMessageToTaskSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const task = await taskService.convertMessageToTask(input.messageId, input.title, input.createdBy);
                return task.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 认领任务
    claim: trpc_1.publicProcedure
        .input(claimTaskSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const task = await taskService.claimTask({
                    taskId: input.taskId,
                    assigneeId: input.assigneeId,
                    assigneeType: input.assigneeType,
                });
                return task.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 放弃认领
    unclaim: trpc_1.publicProcedure
        .input(zod_1.z.object({
        taskId: zod_1.z.string(),
        userId: zod_1.z.string(),
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const task = await taskService.unclaimTask(input.taskId, input.userId);
                return task.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.taskRouter = taskRouter;
