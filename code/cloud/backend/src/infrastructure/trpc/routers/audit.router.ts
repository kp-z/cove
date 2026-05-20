/**
 * Audit Router - 审计日志相关 API
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { requireRole } from '../middleware/auth.middleware';
import type { AuditService } from '../../../application/services/audit/audit.service';
import { TRPCError } from '@trpc/server';

// 查询审计日志 schema
const queryLogsSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// 清理旧日志 schema
const cleanupLogsSchema = z.object({
  daysToKeep: z.number().min(1).max(365).default(90),
});

export function createAuditRouter(auditService: AuditService) {
  return router({
    /**
     * 查询审计日志（需要 admin 或 owner 权限）
     */
    query: protectedProcedure
      .use(requireRole(['admin', 'owner']))
      .input(queryLogsSchema)
      .query(async ({ input }) => {
        try {
          const result = await auditService.queryLogs({
            userId: input.userId,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
            limit: input.limit,
            offset: input.offset,
          });

          return {
            logs: result.logs.map(log => log.toJSON()),
            total: result.total,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to query audit logs',
          });
        }
      }),

    /**
     * 获取用户的审计日志（需要认证）
     */
    getUserLogs: protectedProcedure
      .input(z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input, ctx }) => {
        try {
          // 只允许查看自己的日志，除非是 admin 或 owner
          if (input.userId !== ctx.userId && ctx.userRole !== 'admin' && ctx.userRole !== 'owner') {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You can only view your own audit logs',
            });
          }

          const logs = await auditService.getUserLogs(input.userId, input.limit);

          return {
            logs: logs.map(log => log.toJSON()),
          };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to get user logs',
          });
        }
      }),

    /**
     * 获取资源的审计日志（需要 admin 或 owner 权限）
     */
    getResourceLogs: protectedProcedure
      .use(requireRole(['admin', 'owner']))
      .input(z.object({
        resourceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input }) => {
        try {
          const logs = await auditService.getResourceLogs(input.resourceId, input.limit);

          return {
            logs: logs.map(log => log.toJSON()),
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to get resource logs',
          });
        }
      }),

    /**
     * 清理旧的审计日志（需要 owner 权限）
     */
    cleanup: protectedProcedure
      .use(requireRole(['owner']))
      .input(cleanupLogsSchema)
      .mutation(async ({ input }) => {
        try {
          const deletedCount = await auditService.cleanupOldLogs(input.daysToKeep);

          return {
            deletedCount,
            message: `Deleted ${deletedCount} audit logs older than ${input.daysToKeep} days`,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to cleanup audit logs',
          });
        }
      }),
  });
}
