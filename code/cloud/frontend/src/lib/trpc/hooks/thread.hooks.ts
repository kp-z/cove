import { trpc } from '@/lib/trpc';
import { systemLog } from '@/features/channel/stores/systemEventStore';

export function useThreadMessages(parentMessageId: string, options?: { limit?: number; cursor?: string }) {
  return trpc.thread.getMessages.useQuery(
    {
      parentMessageId,
      limit: options?.limit,
      cursor: options?.cursor,
    },
    {
      enabled: !!parentMessageId,
    }
  );
}

export function useThreadMetadata(parentMessageId: string) {
  return trpc.thread.getMetadata.useQuery(
    { parentMessageId },
    {
      enabled: !!parentMessageId,
    }
  );
}

export function useChannelThreads(channelId: string) {
  return trpc.thread.listByChannel.useQuery(
    { channelId },
    {
      enabled: !!channelId,
      onSuccess: (data) => {
        systemLog.info(
          channelId,
          'query.threads.success',
          `Fetched ${data.threads?.length || 0} threads`,
          { threadCount: data.threads?.length || 0 }
        );
      },
      onError: (error: any) => {
        systemLog.error(
          channelId,
          'query.threads.error',
          `Failed to fetch threads: ${error.message}`,
          { error: error.message }
        );
      },
    }
  );
}

export function useReplyToThread() {
  const utils = trpc.useUtils();

  return trpc.thread.reply.useMutation({
    onSuccess: (_result, variables) => {
      utils.thread.getMessages.invalidate({ parentMessageId: variables.parentMessageId });
      utils.thread.getMetadata.invalidate({ parentMessageId: variables.parentMessageId });
    },
  });
}
