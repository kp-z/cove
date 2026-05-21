import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../../backend/src/infrastructure/trpc/routers';
import { env } from '../../core/config/env';

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

function getCurrentUserId(): string {
  const userStr = localStorage.getItem('current_user') || sessionStorage.getItem('current_user');
  if (!userStr) return '';
  try {
    const user = JSON.parse(userStr);
    return user.id || '';
  } catch {
    return '';
  }
}

/**
 * Vanilla tRPC client for use outside of React components.
 * Use this in adapters, utilities, and other non-React contexts.
 * For React components, use the `trpc` hooks from `lib/trpc.ts`.
 */
export const vanillaTrpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.apiUrl}/trpc`,
      headers() {
        const token = getAuthToken();
        const userId = getCurrentUserId();
        return {
          authorization: token ? `Bearer ${token}` : '',
          'x-user-id': userId,
          'x-realm-id': 'realm-nexus',
        };
      },
    }),
  ],
});
