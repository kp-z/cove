import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => apiClient.getChannels(),
    select: (data) => data.channels,
  });
}
