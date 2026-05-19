import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink, splitLink, wsLink, createWSClient, TRPCClientError } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { TRPCLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';
import { env } from '../core/config/env';
import { useAuthStore } from '../core/auth/authStore';
import { getCurrentUser } from '../core/auth/useCurrentUser';

export const trpc = createTRPCReact<AppRouter>();

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

const authErrorLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (
            err instanceof TRPCClientError &&
            err.data?.code === 'UNAUTHORIZED' &&
            op.path !== 'auth.login' &&
            op.path !== 'auth.verifyToken'
          ) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

const wsClient = createWSClient({
  url: env.wsUrl,
  connectionParams: () => {
    const { userId } = getCurrentUser();
    return {
      userId: userId || 'anonymous',
      userType: 'human',
    };
  },
});

export const trpcClient = trpc.createClient({
  links: [
    loggerLink({
      enabled: (opts) =>
        env.isDevelopment ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    authErrorLink,
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: `${env.apiUrl}/trpc`,
        maxURLLength: 2083,
        headers() {
          const token = getAuthToken();
          const { userId } = getCurrentUser();
          return {
            authorization: token ? `Bearer ${token}` : '',
            'x-user-id': userId || '',
          };
        },
      }),
    }),
  ],
});
