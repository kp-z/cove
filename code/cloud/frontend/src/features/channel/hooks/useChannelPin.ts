import { usePinnedChannels } from './usePinnedChannels';

/**
 * Hook for pin/unpin/reorder operations on channels
 *
 * @param userId - The user ID to manage pins for
 * @returns Object with pin operations and state
 */
export function useChannelPin(userId: string) {
  const { pinnedChannels, setPinnedChannels, isLoading } = usePinnedChannels(userId);

  /**
   * Pin a channel (add to end of pinned list)
   * @param channelId - Channel ID to pin
   * @throws Error if channel is already pinned or limit reached
   */
  const pinChannel = async (channelId: string) => {
    if (pinnedChannels.includes(channelId)) {
      return; // Already pinned, do nothing
    }

    if (pinnedChannels.length >= 10) {
      throw new Error('最多只能置顶 10 个频道');
    }

    await setPinnedChannels([...pinnedChannels, channelId]);
  };

  /**
   * Unpin a channel (remove from pinned list)
   * @param channelId - Channel ID to unpin
   */
  const unpinChannel = async (channelId: string) => {
    await setPinnedChannels(pinnedChannels.filter(id => id !== channelId));
  };

  /**
   * Toggle pin state of a channel
   * @param channelId - Channel ID to toggle
   */
  const togglePin = async (channelId: string) => {
    if (pinnedChannels.includes(channelId)) {
      await unpinChannel(channelId);
    } else {
      await pinChannel(channelId);
    }
  };

  /**
   * Reorder pinned channels
   * @param newOrder - New array of channel IDs in desired order
   */
  const reorderPinned = async (newOrder: string[]) => {
    await setPinnedChannels(newOrder);
  };

  /**
   * Check if a channel is pinned
   * @param channelId - Channel ID to check
   * @returns true if channel is pinned
   */
  const isPinned = (channelId: string): boolean => {
    return pinnedChannels.includes(channelId);
  };

  return {
    pinnedChannels,
    pinChannel,
    unpinChannel,
    togglePin,
    reorderPinned,
    isPinned,
    isLoading,
  };
}
