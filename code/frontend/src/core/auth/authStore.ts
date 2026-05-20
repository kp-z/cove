import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'owner' | 'admin' | 'user' | 'visitor';

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
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  currentRealmId: string;

  login: (user: User, token: string, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setCurrentRealmId: (realmId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: true,
      currentRealmId: 'realm-nexus', // Default realm

      login: (user, token, rememberMe = true) => {
        if (rememberMe) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_id', user.id);
          sessionStorage.removeItem('auth_token');
        } else {
          sessionStorage.setItem('auth_token', token);
          sessionStorage.setItem('user_id', user.id);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_id');
        }
        set({ user, token, isAuthenticated: true, rememberMe });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_id');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      setCurrentRealmId: (realmId) => {
        set({ currentRealmId: realmId });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
