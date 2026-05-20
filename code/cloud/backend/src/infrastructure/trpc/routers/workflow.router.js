"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const workflowStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    taskId: zod_1.z.string(),
    condition: zod_1.z.string().optional(),
    timeoutMinutes: zod_1.z.number().optional(),
    onFailure: zod_1.z.enum(['fail', 'continue', 'retry']).optional(),
    retryConfig: zod_1.z.object({
        maxRetries: zod_1.z.number(),
        backoffStrategy: zod_1.z.enum(['linear', 'exponential']),
        initialDelaySeconds: zod_1.z.number(),
    }).optional(),
});
const workflowTriggerSchema = zod_1.z.object({
    triggerType: zod_1.z.enum(['manual', 'schedule', 'event', 'webhook']),
    enabled: zod_1.z.boolean(),
    eventSource: zod_1.z.string().optional(),
    eventType: zod_1.z.string().optional(),
    krId: zod_1.z.string().optional(),
    schedule: zod_1.z.string().optional(),
});
const createWorkflowSchema = zod_1.z.object({
    projectId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    krId: zod_1.z.string().optional(),
    steps: zod_1.z.array(zod_1.z.array(workflowStepSchema)).readonly(),
    triggers: zod_1.z.array(workflowTriggerSchema).readonly().optional(),
    createdBy: zod_1.z.string(),
});
const updateWorkflowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
});
const workflowRouter = (workflowService) => (0, trpc_1.router)({
    // 创建工作流
    create: trpc_1.publicProcedure
        .input(createWorkflowSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const workflow = await workflowService.createWorkflow(input);
                return workflow.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取工作流列表
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({
        projectId: zod_1.z.string().optional(),
        status: zod_1.z.enum(['draft', 'active', 'paused', 'completed']).optional(),
    }).optional())
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                let workflows = [];
                if (input?.status) {
                    workflows = await workflowService.getWorkflowsByStatus(input.status);
                }
                else if (input?.projectId) {
                    workflows = await workflowService.getWorkflowsByProject(input.projectId);
                }
                else {
                    workflows = [];
                }
                return {
                    workflows: workflows.map(w => w.toJSON()),
                    total: workflows.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个工作流
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ workflowId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const workflow = await workflowService.getWorkflowById(input.workflowId);
                return workflow.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新工作流
    update: trpc_1.publicProcedure
        .input(zod_1.z.object({
        workflowId: zod_1.z.string(),
        data: updateWorkflowSchema,
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const workflow = await workflowService.updateWorkflow(input.workflowId, input.data);
                return workflow.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 执行工作流
    execute: trpc_1.publicProcedure
        .input(zod_1.z.object({ workflowId: zod_1.z.string() }))
        .mutation(async () => {
        // TODO: Implement workflow execution
        throw new server_1.TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Workflow execution not yet implemented',
        });
    }),
    // 删除工作流
    delete: trpc_1.publicProcedure
        .input(zod_1.z.object({ workflowId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await workflowService.deleteWorkflow(input.workflowId);
                return { workflowId: input.workflowId, deleted: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.workflowRouter = workflowRouter;
