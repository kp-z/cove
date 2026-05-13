import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useChannel(channelId: string | null) {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => apiClient.getChannel(channelId!),
    enabled: !!channelId,
  });
}
