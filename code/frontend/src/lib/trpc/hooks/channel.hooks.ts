import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

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
      notify.success('Channel created', 'The channel has been created successfully');
    },
    onError: (error) => {
      notify.error('Failed to create channel', error.message || 'An unexpected error occurred');
    },
  });
}

export function useUpdateChannel() {
  const utils = trpc.useUtils();

  return trpc.channel.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.channel.getById.invalidate({ channelId: variables.channelId });
      utils.channel.list.invalidate();
      notify.success('Channel updated', 'The channel has been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update channel', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteChannel() {
  const utils = trpc.useUtils();

  return trpc.channel.delete.useMutation({
    onSuccess: () => {
      utils.channel.list.invalidate();
      notify.success('Channel deleted', 'The channel has been deleted successfully');
    },
    onError: (error) => {
      notify.error('Failed to delete channel', error.message || 'An unexpected error occurred');
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
      notify.success('Member added', 'The member has been added to the channel');
    },
    onError: (error) => {
      notify.error('Failed to add member', error.message || 'An unexpected error occurred');
    },
  });
}

export function useRemoveChannelMember() {
  const utils = trpc.useUtils();

  return trpc.channel.removeMember.useMutation({
    onSuccess: (_result, variables) => {
      utils.channel.getMembers.invalidate({ channelId: variables.channelId });
      notify.success('Member removed', 'The member has been removed from the channel');
    },
    onError: (error) => {
      notify.error('Failed to remove member', error.message || 'An unexpected error occurred');
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
