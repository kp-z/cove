import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

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
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(async ({ ctx, next }) => {
  // 当前系统无认证，暂时允许所有请求
  // TODO: 实现真正的认证检查
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User ID is required',
    });
  }
  return next({ ctx });
});

// Public procedure with logging
export const procedure = publicProcedure.use(loggerMiddleware);
