import { useAuthStore } from './authStore';
import { useUser } from '@/lib/trpc/hooks/user.hooks';

/**
 * Unified hook for accessing current user information
 *
 * This hook provides a single source of truth for user data across the application.
 * Always use this hook instead of directly accessing localStorage or authStore.
 *
 * IMPORTANT: This hook now uses tRPC query as the single source of truth.
 * The authStore only stores userId and token for authentication.
 *
 * @returns Current user information and authentication state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, userId, isAuthenticated, isLoading } = useCurrentUser();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>Welcome, {user?.displayName}!</div>;
 * }
 * ```
 */
export function useCurrentUser() {
  const { userId, isAuthenticated, token } = useAuthStore();

  // Fetch user data from tRPC query (single source of truth)
  const { data: user, isLoading, error } = useUser(userId || '', {
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    /** Current user object (null if not authenticated or loading) */
    user: user || null,

    /** Current user ID (undefined if not authenticated) */
    userId,

    /** Whether the user is authenticated */
    isAuthenticated,

    /** Whether the user is a guest (not authenticated) */
    isGuest: !isAuthenticated,

    /** Authentication token (null if not authenticated) */
    token,

    /** User role */
    role: user?.role,

    /** User permissions */
    permissions: user?.permissions || [],

    /** Whether user data is loading */
    isLoading,

    /** Error fetching user data */
    error,
  };
}

/**
 * Get current user state synchronously (for use outside React components)
 *
 * Use this function in non-React contexts like tRPC configuration,
 * WebSocket setup, or utility functions.
 *
 * WARNING: This function only returns userId and token from authStore.
 * It does NOT fetch user data. Use useCurrentUser() in React components.
 *
 * @returns Current authentication state
 *
 * @example
 * ```ts
 * import { getCurrentUser } from '@/core/auth/useCurrentUser';
 *
 * const wsClient = createWSClient({
 *   connectionParams: () => {
 *     const { userId } = getCurrentUser();
 *     return { userId: userId || 'anonymous' };
 *   },
 * });
 * ```
 */
export function getCurrentUser() {
  const state = useAuthStore.getState();

  return {
    userId: state.userId,
    isAuthenticated: state.isAuthenticated,
    isGuest: !state.isAuthenticated,
    token: state.token,
  };
}
