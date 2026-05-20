import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

export function useSendMessage() {
  const utils = trpc.useUtils();

  return trpc.message.send.useMutation({
    onSuccess: (_data, variables) => {
      utils.message.list.invalidate({ channelId: variables.channelId });
      notify.success('Message sent', 'Your message has been sent successfully');
    },
    onError: (error) => {
      notify.error('Failed to send message', error.message || 'An unexpected error occurred');
    },
  });
}

export function useMessages(channelId: string, options?: { limit?: number; cursor?: string }) {
  return trpc.message.list.useQuery(
    {
      channelId,
      limit: options?.limit ?? 20,
      cursor: options?.cursor,
    },
    {
      queryKey: ['messages', channelId, options],
      enabled: !!channelId,
    }
  );
}

export function useMessage(messageId: string) {
  return trpc.message.getById.useQuery(
    { messageId },
    {
      enabled: !!messageId,
    }
  );
}

export function useUpdateMessage() {
  const utils = trpc.useUtils();

  return trpc.message.update.useMutation({
    onSuccess: (data) => {
      utils.message.getById.invalidate({ messageId: data.message_id });
      utils.message.list.invalidate({ channelId: data.channel_id });
      notify.success('Message updated', 'Your message has been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update message', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteMessage() {
  const utils = trpc.useUtils();

  return trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate();
      notify.success('Message deleted', 'The message has been deleted successfully');
    },
    onError: (error) => {
      notify.error('Failed to delete message', error.message || 'An unexpected error occurred');
    },
  });
}

export function useAddReaction() {
  const utils = trpc.useUtils();

  return trpc.message.addReaction.useMutation({
    onSuccess: (data) => {
      utils.message.getById.setData({ messageId: data.message_id }, data);
    },
    onError: (error) => {
      notify.error('Failed to add reaction', error.message || 'An unexpected error occurred');
    },
  });
}

export function useRemoveReaction() {
  const utils = trpc.useUtils();

  return trpc.message.removeReaction.useMutation({
    onSuccess: (data) => {
      utils.message.getById.setData({ messageId: data.message_id }, data);
    },
    onError: (error) => {
      notify.error('Failed to remove reaction', error.message || 'An unexpected error occurred');
    },
  });
}

export function useReplyToThread() {
  const utils = trpc.useUtils();

  return trpc.message.replyToThread.useMutation({
    onSuccess: (_data, variables) => {
      utils.message.getThreadMessages.invalidate({ parentMessageId: variables.parentMessageId });
      notify.success('Reply sent', 'Your reply has been sent successfully');
    },
    onError: (error) => {
      notify.error('Failed to send reply', error.message || 'An unexpected error occurred');
    },
  });
}

export function useThreadMessages(parentMessageId: string) {
  return trpc.message.getThreadMessages.useQuery(
    { parentMessageId },
    {
      enabled: !!parentMessageId,
    }
  );
}
