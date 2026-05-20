"use strict";
/**
 * Auth Middleware - 认证与授权中间件
 *
 * 提供基于角色的访问控制（RBAC）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnerOrAdmin = exports.requireRole = void 0;
const server_1 = require("@trpc/server");
const trpc_1 = require("../trpc");
/**
 * 要求特定角色才能访问
 * @param allowedRoles - 允许的角色列表
 */
const requireRole = (allowedRoles) => {
    return (0, trpc_1.middleware)(async ({ ctx, next }) => {
        if (!ctx.userId) {
            throw new server_1.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            });
        }
        if (!ctx.userRole) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'User role not found',
            });
        }
        if (!allowedRoles.includes(ctx.userRole)) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            });
        }
        return next({ ctx });
    });
};
exports.requireRole = requireRole;
/**
 * 要求是资源所有者或管理员
 * 用于只能操作自己数据的场景（如修改个人信息）
 * 注意：此中间件只验证用户已登录，具体的所有权检查需要在 procedure 中进行
 */
exports.requireOwnerOrAdmin = (0, trpc_1.middleware)(async ({ ctx, next }) => {
    if (!ctx.userId) {
        throw new server_1.TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
        });
    }
    return next({ ctx });
});
