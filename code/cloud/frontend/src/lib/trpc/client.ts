import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';
import { env } from '../../core/config/env';

/**
 * Vanilla tRPC client for non-React contexts (e.g., adapters, utilities)
 *
 * This client can be used outside of React components and doesn't require hooks.
 * For React components, use the `trpc` hooks from './index.ts' instead.
 */
export const trpcVanillaClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.apiUrl}/trpc`,
      headers() {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const userId = localStorage.getItem('userId') || '';
        return {
          authorization: token ? `Bearer ${token}` : '',
          'x-user-id': userId,
          'x-realm-id': 'realm-nexus',
        };
      },
    }),
  ],
});
