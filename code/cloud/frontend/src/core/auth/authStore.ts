import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trpcClient } from '@/lib/trpc';
import { logger } from '@/lib/logger';

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

// 认证凭证的唯一真实来源：localStorage（"记住我"）或 sessionStorage（会话级）。
// 注意：不要通过 zustand 的 persist 中间件持久化 token/isAuthenticated，
// 否则会导致未勾选"记住我"时，token 已随浏览器关闭从 sessionStorage 清除，
// 但 persist 仍把上一次的 isAuthenticated/token 写死在 localStorage 里，
// 造成"看起来已登录、实际请求全部 401"的不一致状态。
function getStoredAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

function getStoredUserId(): string | null {
  return localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
}

function getStoredCurrentRealmId(): string | null {
  return localStorage.getItem('current_realm_id') || sessionStorage.getItem('current_realm_id');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 首次创建 store 时（应用启动/刷新）直接以持久化的凭证初始化认证状态，
      // 而不是依赖 zustand persist 自身的全量状态快照。
      userId: getStoredUserId(),
      token: getStoredAuthToken(),
      isAuthenticated: !!getStoredAuthToken() && !!getStoredUserId(),
      rememberMe: true,
      currentRealmId: getStoredCurrentRealmId(),

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
          logger.warn('[authStore] Failed to update user preference (lastAccessedRealmId)', error);
          // 静默失败，不影响用户体验
        });
      },
    }),
    {
      name: 'auth-storage',
      // 只持久化"记住我"这一非敏感偏好；token/userId/isAuthenticated/currentRealmId
      // 均以 localStorage/sessionStorage 中的凭证为唯一真实来源（见上方 getStored* 函数），
      // 避免 persist 的全量快照与凭证的实际存储位置（localStorage vs sessionStorage）产生冲突。
      partialize: (state) => ({ rememberMe: state.rememberMe }),
      // 仅合并 rememberMe 字段：即使 localStorage 中残留旧版本写入的完整状态快照
      // （历史上曾经把 token/isAuthenticated 也存进 'auth-storage'），也不能让这些
      // 陈旧数据把用户"复活"成已登录状态。
      merge: (persistedState, currentState) => ({
        ...currentState,
        rememberMe: (persistedState as Partial<AuthState> | undefined)?.rememberMe ?? currentState.rememberMe,
      }),
    }
  )
);
