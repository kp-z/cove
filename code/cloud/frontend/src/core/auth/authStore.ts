import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'owner' | 'admin' | 'user' | 'visitor';

// Keep User type for backward compatibility and type safety
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
  preference?: { pinned_channels?: string[] };
  createdAt: string;
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

      setCurrentRealmId: (realmId) => {
        const rememberMe = useAuthStore.getState().rememberMe;
        if (rememberMe) {
          localStorage.setItem('current_realm_id', realmId);
        } else {
          sessionStorage.setItem('current_realm_id', realmId);
        }
        set({ currentRealmId: realmId });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
