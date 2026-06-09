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

// RealmContext injection middleware with member verification
const realmContextMiddleware = t.middleware(async ({ ctx, next }) => {
  // Check realmId is present
  if (!ctx.realmId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Realm ID is required. Make sure x-realm-id header is set.',
    });
  }

  // Check userId is present
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User authentication is required.',
    });
  }

  // Verify that the user is a member of the realm
  const isMember = await ctx.realmMemberVerification.isMember(ctx.userId, ctx.realmId);

  if (!isMember) {
    ctx.logger.warn('Access denied - user is not a member of realm', {
      userId: ctx.userId,
      realmId: ctx.realmId,
    });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this realm',
    });
  }

  // Inject RealmContext into AsyncLocalStorage
  const realmContext = RealmContext.create(ctx.realmId, ctx.userId);
  return serverContextStore.run(realmContext, () => next());
});

// Logger middleware（每请求耗时记录，降为 debug 避免刷屏）
const loggerMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  ctx.logger.debug(`tRPC ${type} ${path} - ${duration}ms`);
  return result;
});

// Protected procedure - requires authentication and realm membership
export const protectedProcedure = t.procedure
  .use(realmContextMiddleware)
  .use(loggerMiddleware)
  .use(async ({ ctx, next }) => {
    // Check userId is present
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID is required',
      });
    }

    // Check realmId is present
    if (!ctx.realmId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Realm ID is required',
      });
    }

    // At this point, realmContextMiddleware has already verified:
    // 1. User is a member of the realm (via realmMemberVerification)
    // 2. RealmContext has been injected into AsyncLocalStorage
    // So we can safely proceed

    return next({ ctx });
  });

// Realm procedure - alias for protectedProcedure (requires realm context)
export const realmProcedure = protectedProcedure;

// Public procedure with logging and optional RealmContext injection
// Use this for operations that don't require realm membership (e.g., login, realm list)
export const procedure = publicProcedure.use(loggerMiddleware);
