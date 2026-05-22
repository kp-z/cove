import { trpc } from '@/lib/trpc';
import { notify } from '@/core/services/notificationService';
import { useAuthStore } from '@/core/auth/authStore';

export function useRealmList(options?: { status?: 'active' | 'archived' }) {
  return trpc.realm.list.useQuery(
    { status: options?.status },
    { enabled: true }
  );
}

export function useCurrentRealmRole() {
  const { currentRealmId } = useAuthStore();

  // TODO: 后端需要实现 getUserRole API
  // 临时返回 mock 数据避免崩溃
  return {
    data: 'member' as const,
    isLoading: false,
    error: null,
  };
}

export function useRealm(realmId: string, options?: { enabled?: boolean }) {
  return trpc.realm.getById.useQuery(
    { realmId },
    {
      enabled: options?.enabled !== undefined ? options.enabled : !!realmId,
    }
  );
}

export function useUpdateRealm() {
  const utils = trpc.useUtils();

  return trpc.realm.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.realm.getById.invalidate({ realmId: variables.realmId });
      utils.realm.list.invalidate();
      notify.toast.success('Realm updated', 'The realm settings have been updated successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to update realm', error.message || 'An unexpected error occurred');
    },
  });
}
