import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';
import type { User } from '@/core/auth/authStore';

export function useLogin() {
  const { login } = useAuthStore();

  return trpc.auth.login.useMutation({
    onSuccess: (data) => {
      const user: User = {
        id: data.user.user_id,
        username: data.user.username,
        displayName: data.user.display_name,
        email: data.user.email,
        role: data.user.role as User['role'],
        avatar: data.user.avatar ?? undefined,
        permissions: [...data.user.permissions],
        preference: data.user.preference ?? undefined,
        createdAt: data.user.created_at,
      };
      const rememberMe = useAuthStore.getState().rememberMe;
      login(user, data.token, rememberMe);
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
