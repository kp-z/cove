import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink, splitLink, wsLink, createWSClient } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';
import { env } from '../core/config/env';

export const trpc = createTRPCReact<AppRouter>();

// 创建 WebSocket 客户端
const wsClient = createWSClient({
  url: env.wsUrl,
  connectionParams: () => {
    const userId = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type') || 'human';
    return {
      userId: userId || 'anonymous',
      userType,
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
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
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
    }),
  ],
});
