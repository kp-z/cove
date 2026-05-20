"use strict";
/**
 * Audit Router - 审计日志相关 API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditRouter = createAuditRouter;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const auth_middleware_1 = require("../middleware/auth.middleware");
const server_1 = require("@trpc/server");
// 查询审计日志 schema
const queryLogsSchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    resourceType: zod_1.z.string().optional(),
    resourceId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
});
// 清理旧日志 schema
const cleanupLogsSchema = zod_1.z.object({
    daysToKeep: zod_1.z.number().min(1).max(365).default(90),
});
function createAuditRouter(auditService) {
    return (0, trpc_1.router)({
        /**
         * 查询审计日志（需要 admin 或 owner 权限）
         */
        query: trpc_1.protectedProcedure
            .use((0, auth_middleware_1.requireRole)(['admin', 'owner']))
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
            }
            catch (error) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to query audit logs',
                });
            }
        }),
        /**
         * 获取用户的审计日志（需要认证）
         */
        getUserLogs: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            userId: zod_1.z.string(),
            limit: zod_1.z.number().min(1).max(100).default(50),
        }))
            .query(async ({ input, ctx }) => {
            try {
                // 只允许查看自己的日志，除非是 admin 或 owner
                if (input.userId !== ctx.userId && ctx.userRole !== 'admin' && ctx.userRole !== 'owner') {
                    throw new server_1.TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You can only view your own audit logs',
                    });
                }
                const logs = await auditService.getUserLogs(input.userId, input.limit);
                return {
                    logs: logs.map(log => log.toJSON()),
                };
            }
            catch (error) {
                if (error instanceof server_1.TRPCError)
                    throw error;
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to get user logs',
                });
            }
        }),
        /**
         * 获取资源的审计日志（需要 admin 或 owner 权限）
         */
        getResourceLogs: trpc_1.protectedProcedure
            .use((0, auth_middleware_1.requireRole)(['admin', 'owner']))
            .input(zod_1.z.object({
            resourceId: zod_1.z.string(),
            limit: zod_1.z.number().min(1).max(100).default(50),
        }))
            .query(async ({ input }) => {
            try {
                const logs = await auditService.getResourceLogs(input.resourceId, input.limit);
                return {
                    logs: logs.map(log => log.toJSON()),
                };
            }
            catch (error) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to get resource logs',
                });
            }
        }),
        /**
         * 清理旧的审计日志（需要 owner 权限）
         */
        cleanup: trpc_1.protectedProcedure
            .use((0, auth_middleware_1.requireRole)(['owner']))
            .input(cleanupLogsSchema)
            .mutation(async ({ input }) => {
            try {
                const deletedCount = await auditService.cleanupOldLogs(input.daysToKeep);
                return {
                    deletedCount,
                    message: `Deleted ${deletedCount} audit logs older than ${input.daysToKeep} days`,
                };
            }
            catch (error) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to cleanup audit logs',
                });
            }
        }),
    });
}
