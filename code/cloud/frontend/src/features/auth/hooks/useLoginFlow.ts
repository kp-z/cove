/**
 * useLoginFlow - 登录流程 Hook
 *
 * 封装登录逻辑，简化 LoginPage 组件
 *
 * 职责：
 * - 处理登录请求
 * - 存储认证信息
 * - 存储 Realm 信息
 * - 决定导航目标
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealmStore } from '@/core/stores/realmStore';

interface UserContext {
  isFirstLogin: boolean;
  realms: any[];
  preferences: {
    lastAccessedRealmId?: string;
    pinnedRealmIds?: string[];
  };
}

interface LoginResult {
  token: string;
  user: any;
  defaultRealmId?: string;
  context?: UserContext;
}

export function useLoginFlow() {
  const navigate = useNavigate();
  const { setRealms, setCurrentRealm } = useRealmStore();
  const { login: authLogin } = useAuthStore();

  const loginMutation = trpc.auth.login.useMutation();

  const handleLoginSuccess = useCallback(
    (result: LoginResult) => {
      // 1. 存储认证信息
      authLogin(result.user.user_id, result.token, true);

      // 2. 存储 Realm 信息
      if (result.context?.realms) {
        setRealms(result.context.realms);
      }

      // 3. 决定导航目标
      const destination = determineDestination(result.context);

      // 4. 导航
      navigate(destination);
    },
    [authLogin, setRealms, navigate]
  );

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isLoading,
    error: loginMutation.error,
    handleLoginSuccess,
  };
}

function determineDestination(context?: UserContext): string {
  if (!context) {
    return '/';
  }

  // 首次登录 -> 欢迎向导
  if (context.isFirstLogin) {
    return '/welcome';
  }

  // 有上次访问的 Realm 且可用 -> 直接进入
  const lastRealmId = context.preferences?.lastAccessedRealmId;
  if (lastRealmId) {
    const realm = context.realms.find((r) => r.realmId === lastRealmId);
    if (realm && realm.status === 'active') {
      return `/realm/${lastRealmId}`;
    }
  }

  // 其他情况 -> Realm 选择器
  return '/select-realm';
}
