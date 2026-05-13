import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useMessages(channelId: string | null, threadId?: string | null) {
  return useQuery({
    queryKey: ['messages', channelId, threadId],
    queryFn: () => apiClient.getMessages(channelId!),
    enabled: !!channelId,
    select: (data) => data.messages,
  });
}
