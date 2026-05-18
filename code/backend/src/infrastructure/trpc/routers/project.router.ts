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

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { ProjectService } from '../../../application/services/project/project.service';
import { ServerContext } from '../../../application/context/server-context';

// Zod Schemas
const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.string(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const projectRouter = (projectService: ProjectService) =>
  router({
    // 创建项目
    create: publicProcedure
      .input(createProjectSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const project = await projectService.createProject(input, context);
          return project.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取项目列表
    list: publicProcedure
      .query(async ({ ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const projects = await projectService.getAllProjects(context);

          return {
            projects: projects.map(p => p.toJSON()),
            total: projects.length,
          };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 获取单个项目
    getById: publicProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const project = await projectService.getProjectById(input.projectId, context);
          return project.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 更新项目
    update: publicProcedure
      .input(z.object({
        projectId: z.string(),
        data: updateProjectSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          const project = await projectService.updateProject(input.projectId, input.data, context);
          return project.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 删除项目
    delete: publicProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          await projectService.deleteProject(input.projectId, context);
          return { projectId: input.projectId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
