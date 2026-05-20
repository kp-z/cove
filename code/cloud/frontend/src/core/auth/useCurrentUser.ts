import { useAuthStore } from './authStore';

/**
 * Unified hook for accessing current user information
 *
 * This hook provides a single source of truth for user data across the application.
 * Always use this hook instead of directly accessing localStorage or authStore.
 *
 * @returns Current user information and authentication state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, userId, isAuthenticated } = useCurrentUser();
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
  const { user, isAuthenticated, token } = useAuthStore();

  return {
    /** Current user object (null if not authenticated) */
    user,

    /** Current user ID (undefined if not authenticated) */
    userId: user?.id,

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
  };
}

/**
 * Get current user state synchronously (for use outside React components)
 *
 * Use this function in non-React contexts like tRPC configuration,
 * WebSocket setup, or utility functions.
 *
 * @returns Current user information
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
    user: state.user,
    userId: state.user?.id,
    isAuthenticated: state.isAuthenticated,
    isGuest: !state.isAuthenticated,
    token: state.token,
    role: state.user?.role,
    permissions: state.user?.permissions || [],
  };
}
