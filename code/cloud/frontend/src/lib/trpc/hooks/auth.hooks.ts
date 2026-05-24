import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';

export function useLogin() {
  const { login, setCurrentRealmId } = useAuthStore();
  const utils = trpc.useUtils();

  return trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      const userId = data.user.user_id;
      const rememberMe = useAuthStore.getState().rememberMe;
      const defaultRealmId = data.defaultRealmId ?? undefined;

      // Login with userId only (user data will be fetched via tRPC query)
      login(userId, data.token, rememberMe, defaultRealmId);

      // Pre-populate user data in TanStack Query cache for instant access
      utils.user.getById.setData({ userId }, data.user);

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
      const userId = data.user.user_id;
      const rememberMe = useAuthStore.getState().rememberMe;
      const defaultRealmId = data.defaultRealmId ?? undefined;

      // Login with userId only (user data will be fetched via tRPC query)
      login(userId, data.token, rememberMe, defaultRealmId);

      // Pre-populate user data in TanStack Query cache for instant access
      utils.user.getById.setData({ userId }, data.user);

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
