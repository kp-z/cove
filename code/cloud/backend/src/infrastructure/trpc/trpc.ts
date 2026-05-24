import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { serverContextStore } from '../../application/context/realm-context-store';
import { RealmContext } from '../../application/context/realm-context';

const t = initTRPC.context<Context>().create({
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

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// RealmContext injection middleware
const realmContextMiddleware = t.middleware(async ({ ctx, next }) => {
  // Debug logging
  console.log('[RealmContext Middleware]', {
    realmId: ctx.realmId,
    userId: ctx.userId,
    hasRealmId: !!ctx.realmId,
    hasUserId: !!ctx.userId
  });

  // Inject RealmContext into AsyncLocalStorage if realmId and userId are available
  if (ctx.realmId && ctx.userId) {
    const realmContext = RealmContext.create(ctx.realmId, ctx.userId);
    return serverContextStore.run(realmContext, () => next());
  }

  // If no realmId or userId, proceed without RealmContext
  console.log('[RealmContext Middleware] Skipping - missing realmId or userId');
  return next();
});

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
export const protectedProcedure = t.procedure
  .use(realmContextMiddleware)
  .use(loggerMiddleware)
  .use(async ({ ctx, next }) => {
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

// Public procedure with logging and RealmContext injection
export const procedure = publicProcedure.use(realmContextMiddleware).use(loggerMiddleware);
