/**
 * Avatar tRPC Hooks
 */

import { trpc } from '@/lib/trpc';

export interface PresetAvatarInfo {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
}

/**
 * Get all preset avatars
 */
export function usePresetAvatars(entityType?: 'user' | 'agent' | 'channel' | 'realm') {
  // Backend API doesn't need entityType parameter, it returns all presets
  const query = trpc.avatar.getPresetAvatars.useQuery();

  return {
    ...query,
    data: query.data?.presets as PresetAvatarInfo[] | undefined,
  };
}

/**
 * Upload avatar mutation
 *
 * Automatically invalidates relevant queries after upload.
 * No manual sync needed - TanStack Query handles cache updates.
 */
export function useUploadAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.uploadAvatar.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate relevant queries - TanStack Query will refetch automatically
      if (variables.entityType === 'user') {
        utils.user.getById.invalidate({ userId: variables.entityId });
        utils.user.list.invalidate();
      } else if (variables.entityType === 'agent') {
        utils.agent.getById.invalidate({ agentId: variables.entityId });
        utils.agent.list.invalidate();
      } else if (variables.entityType === 'channel') {
        utils.channel.getById.invalidate({ channelId: variables.entityId });
        utils.channel.list.invalidate();
      }
    },
  });
}

/**
 * Set preset avatar mutation
 *
 * Automatically invalidates relevant queries after setting preset.
 * No manual sync needed - TanStack Query handles cache updates.
 */
export function useSetPresetAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.setPresetAvatar.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate relevant queries - TanStack Query will refetch automatically
      if (variables.entityType === 'user') {
        utils.user.getById.invalidate({ userId: variables.entityId });
        utils.user.list.invalidate();
      } else if (variables.entityType === 'agent') {
        utils.agent.getById.invalidate({ agentId: variables.entityId });
        utils.agent.list.invalidate();
      } else if (variables.entityType === 'channel') {
        utils.channel.getById.invalidate({ channelId: variables.entityId });
        utils.channel.list.invalidate();
      }
    },
  });
}

/**
 * Delete avatar mutation
 *
 * Automatically invalidates relevant queries after deletion.
 * No manual sync needed - TanStack Query handles cache updates.
 */
export function useDeleteAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.deleteAvatar.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate relevant queries - TanStack Query will refetch automatically
      if (variables.entityType === 'user') {
        utils.user.getById.invalidate({ userId: variables.entityId });
        utils.user.list.invalidate();
      } else if (variables.entityType === 'agent') {
        utils.agent.getById.invalidate({ agentId: variables.entityId });
        utils.agent.list.invalidate();
      } else if (variables.entityType === 'channel') {
        utils.channel.getById.invalidate({ channelId: variables.entityId });
        utils.channel.list.invalidate();
      }
    },
  });
}
