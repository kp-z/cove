/**
 * Workflow tRPC Router
 *
 * Procedures:
 * - create: 创建工作流
 * - list: 获取工作流列表（支持按 projectId, status 过滤）
 * - getById: 获取单个工作流
 * - update: 更新工作流
 * - execute: 执行工作流
 * - delete: 删除工作流
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { WorkflowService } from '../../../application/services/workflow/workflow.service';
import { ServerContext } from '../../../application/context/server-context';

// Zod Schemas
const workflowStepSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  condition: z.string().optional(),
  timeoutMinutes: z.number().optional(),
  onFailure: z.enum(['fail', 'continue', 'retry']).optional(),
  retryConfig: z.object({
    maxRetries: z.number(),
    backoffStrategy: z.enum(['linear', 'exponential']),
    initialDelaySeconds: z.number(),
  }).optional(),
});

const workflowTriggerSchema = z.object({
  triggerType: z.enum(['manual', 'schedule', 'event', 'webhook']),
  enabled: z.boolean(),
  eventSource: z.string().optional(),
  eventType: z.string().optional(),
  krId: z.string().optional(),
  schedule: z.string().optional(),
});

const createWorkflowSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  krId: z.string().optional(),
  steps: z.array(z.array(workflowStepSchema)).readonly(),
  triggers: z.array(workflowTriggerSchema).readonly().optional(),
  createdBy: z.string(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const workflowRouter = (workflowService: WorkflowService) =>
  router({
    // 创建工作流
    create: publicProcedure
      .input(createWorkflowSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const workflow = await workflowService.createWorkflow(input, context);
          return workflow.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取工作流列表
    list: publicProcedure
      .input(z.object({
        projectId: z.string().optional(),
        status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          let workflows: any[] = [];

          if (input?.status) {
            workflows = await workflowService.getWorkflowsByStatus(input.status, context);
          } else if (input?.projectId) {
            workflows = await workflowService.getWorkflowsByProject(input.projectId, context);
          } else {
            workflows = [];
          }

          return {
            workflows: workflows.map(w => w.toJSON()),
            total: workflows.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个工作流
    getById: publicProcedure
      .input(z.object({ workflowId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const workflow = await workflowService.getWorkflowById(input.workflowId, context);
          return workflow.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新工作流
    update: publicProcedure
      .input(z.object({
        workflowId: z.string(),
        data: updateWorkflowSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const workflow = await workflowService.updateWorkflow(input.workflowId, input.data, context);
          return workflow.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 执行工作流
    execute: publicProcedure
      .input(z.object({ workflowId: z.string() }))
      .mutation(async () => {
        // TODO: Implement workflow execution
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Workflow execution not yet implemented',
        });
      }),

    // 删除工作流
    delete: publicProcedure
      .input(z.object({ workflowId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          await workflowService.deleteWorkflow(input.workflowId, context);
          return { workflowId: input.workflowId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
