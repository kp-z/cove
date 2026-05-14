import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';
import { env } from '../core/config/env';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    loggerLink({
      enabled: (opts) =>
        env.isDevelopment ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${env.apiUrl}/trpc`,
      maxURLLength: 2083,
      headers() {
        const token = localStorage.getItem('auth_token');
        const userId = localStorage.getItem('user_id');
        return {
          authorization: token ? `Bearer ${token}` : '',
          'x-user-id': userId || '',
        };
      },
    }),
  ],
});
