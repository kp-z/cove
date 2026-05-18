import { trpc } from '@/lib/trpc';

/**
 * Hook for managing pinned channels for a user
 *
 * @param userId - The user ID to manage pinned channels for
 * @returns Object containing pinned channel IDs and setter function
 */
export function usePinnedChannels(userId: string) {
  const utils = trpc.useUtils();

  // Get user data including pinned channels
  const { data: user } = trpc.user.getById.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const pinnedChannels = user?.preference?.pinned_channels || [];

  // Update user preference mutation
  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      utils.user.getById.invalidate({ userId });
    },
  });

  /**
   * Set the pinned channels list
   * @param channelIds - Array of channel IDs to pin (max 10)
   * @throws Error if more than 10 channels
   */
  const setPinnedChannels = async (channelIds: string[]) => {
    if (channelIds.length > 10) {
      throw new Error('最多只能置顶 10 个频道');
    }

    await updateUser.mutateAsync({
      userId,
      data: {
        preference: {
          pinned_channels: channelIds,
        },
      },
    });
  };

  return {
    pinnedChannels,
    setPinnedChannels,
    isLoading: updateUser.isPending,
  };
}
