import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

export function useRealm(realmId: string, options?: { enabled?: boolean }) {
  return trpc.realm.getById.useQuery(
    { realmId },
    {
      enabled: options?.enabled !== undefined ? options.enabled : !!realmId,
    }
  );
}

export function useRealmList(filters?: { ownerId?: string; status?: 'active' | 'archived' }) {
  return trpc.realm.list.useQuery(filters, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateRealm() {
  const utils = trpc.useUtils();

  return trpc.realm.create.useMutation({
    onSuccess: () => {
      utils.realm.list.invalidate();
      notify.success('Realm created', 'The realm has been created successfully');
    },
    onError: (error) => {
      notify.error('Failed to create realm', error.message || 'An unexpected error occurred');
    },
  });
}

export function useUpdateRealm() {
  const utils = trpc.useUtils();

  return trpc.realm.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.realm.getById.invalidate({ realmId: variables.realmId });
      utils.realm.list.invalidate();
      notify.success('Realm updated', 'The realm settings have been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update realm', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteRealm() {
  const utils = trpc.useUtils();

  return trpc.realm.delete.useMutation({
    onSuccess: () => {
      utils.realm.list.invalidate();
      notify.success('Realm deleted', 'The realm has been deleted successfully');
    },
    onError: (error) => {
      notify.error('Failed to delete realm', error.message || 'An unexpected error occurred');
    },
  });
}
