"use strict";
/**
 * Project tRPC Router
 *
 * Procedures:
 * - create: 创建项目
 * - list: 获取项目列表
 * - getById: 获取单个项目
 * - update: 更新项目
 * - delete: 删除项目
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const realm_context_1 = require("../../../application/context/realm-context");
const realm_context_store_1 = require("../../../application/context/realm-context-store");
// Zod Schemas
const createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    ownerId: zod_1.z.string(),
});
const updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
});
const projectRouter = (projectService) => (0, trpc_1.router)({
    // 创建项目
    create: trpc_1.publicProcedure
        .input(createProjectSchema)
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const project = await projectService.createProject(input);
                return project.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取项目列表
    list: trpc_1.publicProcedure
        .query(async ({ ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const projects = await projectService.getAllProjects();
                return {
                    projects: projects.map(p => p.toJSON()),
                    total: projects.length,
                };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 获取单个项目
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ projectId: zod_1.z.string() }))
        .query(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const project = await projectService.getProjectById(input.projectId);
                return project.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 更新项目
    update: trpc_1.publicProcedure
        .input(zod_1.z.object({
        projectId: zod_1.z.string(),
        data: updateProjectSchema,
    }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                const project = await projectService.updateProject(input.projectId, input.data);
                return project.toJSON();
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
    // 删除项目
    delete: trpc_1.publicProcedure
        .input(zod_1.z.object({ projectId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        try {
            const context = realm_context_1.RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
            return await (0, realm_context_store_1.runWithContext)(context, async () => {
                await projectService.deleteProject(input.projectId);
                return { projectId: input.projectId, deleted: true };
            });
        }
        catch (error) {
            throw (0, errors_1.mapErrorToTRPC)(error);
        }
    }),
});
exports.projectRouter = projectRouter;
