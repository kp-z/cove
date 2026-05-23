import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';
import type { User } from '@/core/auth/authStore';

export function useLogin() {
  const { login, setCurrentRealmId } = useAuthStore();
  const utils = trpc.useUtils();

  return trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      const user: User = {
        id: data.user.user_id,
        username: data.user.username,
        displayName: data.user.display_name,
        email: data.user.email,
        role: data.user.role as User['role'],
        avatar: data.user.avatar?.url ?? undefined,
        permissions: [...data.user.permissions],
        preference: data.user.preference ?? undefined,
        createdAt: data.user.created_at,
      };
      const rememberMe = useAuthStore.getState().rememberMe;
      const defaultRealmId = data.defaultRealmId ?? undefined;

      // 先登录
      login(user, data.token, rememberMe, defaultRealmId);

      // 如果后端没有返回 defaultRealmId，自动选择第一个 realm
      if (!defaultRealmId) {
        try {
          const realmsData = await utils.realm.list.fetch();
          if (realmsData && realmsData.length > 0) {
            setCurrentRealmId(realmsData[0].realm_id);
          }
        } catch (error) {
          console.error('Failed to fetch realms after login:', error);
        }
      }
    },
  });
}

export function useRegister() {
  const { login, setCurrentRealmId } = useAuthStore();
  const utils = trpc.useUtils();

  return trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      const user: User = {
        id: data.user.user_id,
        username: data.user.username,
        displayName: data.user.display_name,
        email: data.user.email,
        role: data.user.role as User['role'],
        avatar: data.user.avatar?.url ?? undefined,
        permissions: [...data.user.permissions],
        preference: data.user.preference ?? undefined,
        createdAt: data.user.created_at,
      };
      const rememberMe = useAuthStore.getState().rememberMe;
      const defaultRealmId = data.defaultRealmId ?? undefined;

      // 先登录
      login(user, data.token, rememberMe, defaultRealmId);

      // 如果后端没有返回 defaultRealmId，自动选择第一个 realm
      if (!defaultRealmId) {
        try {
          const realmsData = await utils.realm.list.fetch();
          if (realmsData && realmsData.length > 0) {
            setCurrentRealmId(realmsData[0].realm_id);
          }
        } catch (error) {
          console.error('Failed to fetch realms after registration:', error);
        }
      }
    },
  });
}

export function useVerifyToken(token: string | null) {
  return trpc.auth.verifyToken.useQuery(
    { token: token! },
    {
      enabled: !!token,
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  );
}
