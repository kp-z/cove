import { trpc } from '@/lib/trpc';

export function useChannels() {
  return trpc.channel.list.useQuery();
}

export function useChannel(id: string) {
  return trpc.channel.getById.useQuery(
    { channelId: id },
    {
      enabled: !!id,
    }
  );
}

export function useCreateChannel() {
  const utils = trpc.useUtils();

  return trpc.channel.create.useMutation({
    onSuccess: () => {
      utils.channel.list.invalidate();
    },
  });
}

export function useUpdateChannel() {
  const utils = trpc.useUtils();

  return trpc.channel.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.channel.getById.invalidate({ channelId: variables.channelId });
      utils.channel.list.invalidate();
    },
  });
}

export function useDeleteChannel() {
  const utils = trpc.useUtils();

  return trpc.channel.delete.useMutation({
    onSuccess: () => {
      utils.channel.list.invalidate();
    },
  });
}

export function useChannelMembers(channelId: string) {
  return trpc.channel.getMembers.useQuery(
    { channelId },
    {
      enabled: !!channelId,
    }
  );
}

export function useAddChannelMember() {
  const utils = trpc.useUtils();

  return trpc.channel.addMember.useMutation({
    onSuccess: (_result, variables) => {
      utils.channel.getMembers.invalidate({ channelId: variables.channelId });
    },
  });
}

export function useRemoveChannelMember() {
  const utils = trpc.useUtils();

  return trpc.channel.removeMember.useMutation({
    onSuccess: (_result, variables) => {
      utils.channel.getMembers.invalidate({ channelId: variables.channelId });
    },
  });
}

export function useChannelAgents(channelId: string) {
  return trpc.channel.getAgents.useQuery(
    { channelId },
    {
      enabled: !!channelId,
    }
  );
}
