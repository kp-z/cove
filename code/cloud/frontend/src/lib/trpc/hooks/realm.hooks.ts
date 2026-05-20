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

export function useUpdateRealm() {
  const utils = trpc.useUtils();

  return trpc.realm.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.realm.getById.invalidate({ realmId: variables.realmId });
      notify.success('Realm updated', 'The realm settings have been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update realm', error.message || 'An unexpected error occurred');
    },
  });
}
