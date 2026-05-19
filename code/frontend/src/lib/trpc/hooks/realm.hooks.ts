import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

export function useServer(realmId: string, options?: { enabled?: boolean }) {
  return trpc.server.getById.useQuery(
    { realmId },
    {
      enabled: options?.enabled !== undefined ? options.enabled : !!realmId,
    }
  );
}

export function useUpdateServer() {
  const utils = trpc.useUtils();

  return trpc.server.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.server.getById.invalidate({ realmId: variables.realmId });
      notify.success('Server updated', 'The server settings have been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update server', error.message || 'An unexpected error occurred');
    },
  });
}
