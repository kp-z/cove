"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.procedure = exports.protectedProcedure = exports.middleware = exports.publicProcedure = exports.router = void 0;
const server_1 = require("@trpc/server");
const t = server_1.initTRPC.context().create({
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
        };
    },
});
exports.router = t.router;
exports.publicProcedure = t.procedure;
exports.middleware = t.middleware;
// Logger middleware
const loggerMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
    const start = Date.now();
    ctx.logger.info(`tRPC ${type} ${path} - Start`);
    const result = await next();
    const duration = Date.now() - start;
    ctx.logger.info(`tRPC ${type} ${path} - ${duration}ms`);
    return result;
});
// Protected procedure - 需要认证
exports.protectedProcedure = t.procedure.use(loggerMiddleware).use(async ({ ctx, next }) => {
    // 当前系统无认证，暂时允许所有请求
    // TODO: 实现真正的认证检查
    if (!ctx.userId) {
        throw new server_1.TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User ID is required',
        });
    }
    return next({ ctx });
});
// Public procedure with logging
exports.procedure = exports.publicProcedure.use(loggerMiddleware);
