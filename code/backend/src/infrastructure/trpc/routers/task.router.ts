/**
 * Task tRPC Router
 *
 * Procedures:
 * - create: 创建任务
 * - list: 获取任务列表（支持按 projectId, channelId, status, priority 过滤）
 * - getById: 获取单个任务
 * - update: 更新任务
 * - delete: 删除任务
 * - convertMessageToTask: 消息转任务
 * - claim: 认领任务
 * - unclaim: 放弃认领
 * - updateStatus: 更新任务状态
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TaskService } from '../../../application/services/task/task.service';
import { mapErrorToTRPC } from '../../../common/errors';

// Zod Schemas
const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.enum(['single_agent', 'multi_agent', 'workflow']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  channelId: z.string(),
  krId: z.string().optional(),
  dependsOn: z.array(z.string()).readonly().optional(),
  createdBy: z.string(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
});

const convertMessageToTaskSchema = z.object({
  messageId: z.string(),
  title: z.string().min(1),
  createdBy: z.string(),
});

const claimTaskSchema = z.object({
  taskId: z.string(),
  assigneeId: z.string(),
  assigneeType: z.enum(['human', 'agent']).optional().default('human'),
});

const updateStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']),
  actorId: z.string(),
});

export const taskRouter = (taskService: TaskService) =>
  router({
    // 创建任务
    create: publicProcedure
      .input(createTaskSchema)
      .mutation(async ({ input }) => {
        try {
          const task = await taskService.createTask(input);
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取任务列表
    list: publicProcedure
      .input(z.object({
        projectId: z.string().optional(),
        channelId: z.string().optional(),
        status: z.enum(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']).optional(),
        priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          let tasks: any[] = [];

          if (input?.channelId) {
            tasks = await taskService.getTasksByChannel(input.channelId);
          } else if (input?.status) {
            tasks = await taskService.getTasksByStatus(input.status);
          } else if (input?.priority) {
            tasks = await taskService.getTasksByPriority(input.priority);
          } else if (input?.projectId) {
            tasks = await taskService.getTasksByProject(input.projectId);
          } else {
            // Default: get all tasks (you may want to add a getAllTasks method)
            tasks = [];
          }

          return {
            tasks: tasks.map(t => t.toJSON()),
            total: tasks.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个任务
    getById: publicProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        try {
          const task = await taskService.getTaskById(input.taskId);
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新任务
    update: publicProcedure
      .input(z.object({
        taskId: z.string(),
        data: updateTaskSchema,
      }))
      .mutation(async ({ input }) => {
        try {
          const task = await taskService.updateTask(input.taskId, input.data);
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除任务
    delete: publicProcedure
      .input(z.object({ taskId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await taskService.deleteTask(input.taskId);
          return { taskId: input.taskId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 消息转任务
    convertMessageToTask: publicProcedure
      .input(convertMessageToTaskSchema)
      .mutation(async ({ input }) => {
        try {
          const task = await taskService.convertMessageToTask(
            input.messageId,
            input.title,
            input.createdBy
          );
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 认领任务
    claim: publicProcedure
      .input(claimTaskSchema)
      .mutation(async ({ input }) => {
        try {
          const task = await taskService.claimTask({
            taskId: input.taskId,
            assigneeId: input.assigneeId,
            assigneeType: input.assigneeType,
          });
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 放弃认领
    unclaim: publicProcedure
      .input(z.object({
        taskId: z.string(),
        userId: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const task = await taskService.unclaimTask(input.taskId, input.userId);
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新任务状态
    updateStatus: publicProcedure
      .input(updateStatusSchema)
      .mutation(async ({ input }) => {
        try {
          const task = await taskService.updateTaskStatus(
            input.taskId,
            input.status,
            input.actorId
          );
          return task.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
