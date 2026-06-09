import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trpcClient } from '@/lib/trpc';

export type UserRole = 'owner' | 'admin' | 'user' | 'visitor';

// Keep User type for backward compatibility and type safety
export interface User {
  id: string;
  user_id?: string; // Backend returns user_id (snake_case)
  username: string;
  displayName: string;
  display_name?: string; // Backend returns display_name (snake_case)
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
  preference?: { pinned_channels?: string[] };
  createdAt: string;
  created_at?: string; // Backend returns created_at (snake_case)
}

interface AuthState {
  // Store only userId instead of full user object
  userId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  currentRealmId: string | null;

  login: (userId: string, token: string, rememberMe?: boolean, realmId?: string) => void;
  logout: () => void;
  setCurrentRealmId: (realmId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      token: null,
      isAuthenticated: false,
      rememberMe: true,
      currentRealmId: null,

      login: (userId, token, rememberMe = true, realmId) => {
        if (rememberMe) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_id', userId);
          if (realmId) {
            localStorage.setItem('current_realm_id', realmId);
          }
          sessionStorage.removeItem('auth_token');
        } else {
          sessionStorage.setItem('auth_token', token);
          sessionStorage.setItem('user_id', userId);
          if (realmId) {
            sessionStorage.setItem('current_realm_id', realmId);
          }
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_id');
        }
        set({ userId, token, isAuthenticated: true, rememberMe, currentRealmId: realmId || null });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('current_realm_id');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_id');
        sessionStorage.removeItem('current_realm_id');
        set({ userId: null, token: null, isAuthenticated: false, currentRealmId: null });
      },

      setCurrentRealmId: (realmId: string | null) => {
        if (realmId === null) {
          // 清除缓存
          localStorage.removeItem('current_realm_id');
          sessionStorage.removeItem('current_realm_id');
          set({ currentRealmId: null });
          return;
        }

        const rememberMe = useAuthStore.getState().rememberMe;
        if (rememberMe) {
          localStorage.setItem('current_realm_id', realmId);
        } else {
          sessionStorage.setItem('current_realm_id', realmId);
        }
        set({ currentRealmId: realmId });

        // 异步更新后端用户偏好（静默失败，不影响主流程）
        trpcClient.user.updatePreferences.mutate({
          lastAccessedRealmId: realmId,
        }).catch((error) => {
          console.warn('Failed to update user preference (lastAccessedRealmId):', error);
          // 静默失败，不影响用户体验
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
