import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

export function useServer(serverId: string, options?: { enabled?: boolean }) {
  return trpc.server.getById.useQuery(
    { serverId },
    {
      enabled: options?.enabled !== undefined ? options.enabled : !!serverId,
    }
  );
}

export function useUpdateServer() {
  const utils = trpc.useUtils();

  return trpc.server.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.server.getById.invalidate({ serverId: variables.serverId });
      notify.success('Server updated', 'The server settings have been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update server', error.message || 'An unexpected error occurred');
    },
  });
}
