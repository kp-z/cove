"use strict";
/**
 * Auth Router - 认证相关 API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = createAuthRouter;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const auth_errors_1 = require("../../../application/services/auth/auth.errors");
const server_1 = require("@trpc/server");
// 注册请求 schema
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, {
        message: 'Username must contain only letters, numbers, and underscores',
    }),
    email: zod_1.z.string().email('Valid email is required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    displayName: zod_1.z.string().min(1, 'Display name is required'),
});
// 登录请求 schema
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// 验证令牌请求 schema
const verifyTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
});
// 修改密码 schema
const changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1, 'Old password is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
// 请求密码重置 schema
const requestPasswordResetSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email is required'),
});
// 重置密码 schema
const resetPasswordSchema = zod_1.z.object({
    resetToken: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
function createAuthRouter(authService) {
    return (0, trpc_1.router)({
        /**
         * 用户注册接口（公开）
         */
        register: trpc_1.procedure
            .input(registerSchema)
            .mutation(async ({ input, ctx }) => {
            try {
                // Extract IP address and User Agent from request
                const ipAddress = ctx.req.headers['x-forwarded-for']?.split(',')[0] ||
                    ctx.req.socket.remoteAddress;
                const userAgent = ctx.req.headers['user-agent'];
                const result = await authService.register(input, ipAddress, userAgent);
                return {
                    success: true,
                    user: result.user.toJSON(),
                    token: result.token,
                    message: 'Registration successful',
                };
            }
            catch (error) {
                // TRPCError 会被直接抛出
                if (error instanceof server_1.TRPCError) {
                    throw error;
                }
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Registration failed',
                });
            }
        }),
        /**
         * 登录接口（公开）
         */
        login: trpc_1.procedure
            .input(loginSchema)
            .mutation(async ({ input, ctx }) => {
            try {
                // Extract IP address and User Agent from request
                const ipAddress = ctx.req.headers['x-forwarded-for']?.split(',')[0] ||
                    ctx.req.socket.remoteAddress;
                const userAgent = ctx.req.headers['user-agent'];
                const result = await authService.login(input.username, input.password, ipAddress, userAgent);
                return {
                    token: result.token,
                    user: result.user.toJSON(),
                };
            }
            catch (error) {
                if (error instanceof auth_errors_1.InvalidCredentialsError) {
                    throw new server_1.TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'Invalid username or password',
                    });
                }
                if (error instanceof auth_errors_1.UserDisabledError) {
                    throw new server_1.TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Account is disabled',
                    });
                }
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Login failed',
                });
            }
        }),
        /**
         * 验证令牌接口（公开）
         */
        verifyToken: trpc_1.procedure
            .input(verifyTokenSchema)
            .query(async ({ input }) => {
            try {
                const payload = await authService.verifyToken(input.token);
                return {
                    valid: true,
                    userId: payload.userId,
                    username: payload.username,
                    role: payload.role,
                };
            }
            catch (error) {
                if (error instanceof auth_errors_1.InvalidTokenError) {
                    throw new server_1.TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or expired token',
                    });
                }
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Token verification failed',
                });
            }
        }),
        /**
         * 获取当前用户信息（受保护）
         */
        me: trpc_1.protectedProcedure
            .query(async ({ ctx }) => {
            // ctx.userId 已经由 protectedProcedure 验证存在
            // 这里可以从数据库获取完整用户信息
            return {
                userId: ctx.userId,
                // 可以扩展返回更多用户信息
            };
        }),
        /**
         * 修改密码（受保护）
         */
        changePassword: trpc_1.protectedProcedure
            .input(changePasswordSchema)
            .mutation(async ({ input, ctx }) => {
            try {
                await authService.changePassword(ctx.userId, input.oldPassword, input.newPassword);
                return {
                    success: true,
                    message: 'Password changed successfully',
                };
            }
            catch (error) {
                if (error instanceof auth_errors_1.InvalidCredentialsError) {
                    throw new server_1.TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'Invalid old password',
                    });
                }
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to change password',
                });
            }
        }),
        /**
         * 请求密码重置（公开）
         */
        requestPasswordReset: trpc_1.procedure
            .input(requestPasswordResetSchema)
            .mutation(async ({ input }) => {
            try {
                const resetToken = await authService.requestPasswordReset(input.email);
                // 在实际生产环境中，应该通过邮件发送 resetToken
                // 这里为了演示，直接返回 token
                return {
                    success: true,
                    message: 'Password reset email sent',
                    resetToken, // 生产环境不应返回，应通过邮件发送
                };
            }
            catch (error) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to request password reset',
                });
            }
        }),
        /**
         * 重置密码（公开）
         */
        resetPassword: trpc_1.procedure
            .input(resetPasswordSchema)
            .mutation(async ({ input }) => {
            try {
                await authService.resetPassword(input.resetToken, input.newPassword);
                return {
                    success: true,
                    message: 'Password reset successfully',
                };
            }
            catch (error) {
                if (error instanceof auth_errors_1.InvalidTokenError) {
                    throw new server_1.TRPCError({
                        code: 'UNAUTHORIZED',
                        message: error.message,
                    });
                }
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Failed to reset password',
                });
            }
        }),
    });
}
