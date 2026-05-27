import { trpc } from '@/lib/trpc';
import { notify } from '@/core/services/notificationService';
import { useAuthStore } from '@/core/auth/authStore';

export function useRealmList(options?: { status?: 'active' | 'archived' }) {
  const { userId, isAuthenticated } = useAuthStore();

  return trpc.realm.list.useQuery(
    { status: options?.status },
    {
      enabled: isAuthenticated && !!userId,
      staleTime: 5 * 60 * 1000,
    }
  );
}

export function useCurrentRealmRole() {
  const { currentRealmId, userId } = useAuthStore();

  return trpc.realm.getUserRole.useQuery(
    {
      realmId: currentRealmId || '',
      userId: userId || '',
    },
    {
      enabled: !!currentRealmId && !!userId,
    }
  );
}

export function useRealm(realmId: string, options?: { enabled?: boolean }) {
  const { userId, isAuthenticated } = useAuthStore();

  return trpc.realm.getById.useQuery(
    { realmId },
    {
      enabled: options?.enabled !== undefined
        ? options.enabled && isAuthenticated && !!userId && !!realmId
        : isAuthenticated && !!userId && !!realmId,
      staleTime: 5 * 60 * 1000,
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

export function useCreateRealm() {
  const utils = trpc.useUtils();

  return trpc.realm.create.useMutation({
    onSuccess: () => {
      utils.realm.list.invalidate();
      notify.toast.success('Realm created', 'The new realm has been created successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to create realm', error.message || 'An unexpected error occurred');
    },
  });
}

export function useRealmMembers(realmId: string, options?: { enabled?: boolean }) {
  const { userId, isAuthenticated } = useAuthStore();

  return trpc.realm.getMembers.useQuery(
    { realmId },
    {
      enabled: options?.enabled !== undefined
        ? options.enabled && isAuthenticated && !!userId && !!realmId
        : isAuthenticated && !!userId && !!realmId,
      staleTime: 2 * 60 * 1000,
    }
  );
}

export function useDeviceStatus(realmId: string, options?: { enabled?: boolean }) {
  const { userId, isAuthenticated } = useAuthStore();

  return trpc.realm.getDeviceStatus.useQuery(
    { realmId },
    {
      enabled: options?.enabled !== undefined
        ? options.enabled && isAuthenticated && !!userId && !!realmId
        : isAuthenticated && !!userId && !!realmId,
      refetchInterval: 30000,
      staleTime: 30 * 1000,
    }
  );
}
