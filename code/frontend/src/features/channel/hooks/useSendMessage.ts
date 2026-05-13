import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { SendMessageDTO } from '../api/client';

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SendMessageDTO) => apiClient.sendMessage(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channel_id] });
    },
  });
}
