/**
 * Avatar tRPC Hooks
 */

import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';

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
 */
export function useUploadAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.uploadAvatar.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate relevant queries after upload
      if (variables.entityType === 'user') {
        // Invalidate specific user query
        utils.user.getById.invalidate({ userId: variables.entityId });
        utils.user.list.invalidate();

        // Update authStore if uploading for current user
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.id === variables.entityId) {
          updateUser({ avatar: data.avatarUrl });
        }
      } else if (variables.entityType === 'agent') {
        utils.agent.invalidate();
      }
    },
  });
}

/**
 * Set preset avatar mutation
 */
export function useSetPresetAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.setPresetAvatar.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate relevant queries after setting preset
      if (variables.entityType === 'user') {
        // Invalidate specific user query
        utils.user.getById.invalidate({ userId: variables.entityId });
        utils.user.list.invalidate();

        // Update authStore if setting for current user
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.id === variables.entityId) {
          updateUser({ avatar: data.avatarUrl });
        }
      } else if (variables.entityType === 'agent') {
        utils.agent.invalidate();
      }
    },
  });
}

/**
 * Delete avatar mutation
 */
export function useDeleteAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.deleteAvatar.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate relevant queries after deletion
      if (variables.entityType === 'user') {
        // Invalidate specific user query
        utils.user.getById.invalidate({ userId: variables.entityId });
        utils.user.list.invalidate();

        // Update authStore if deleting for current user
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.id === variables.entityId) {
          updateUser({ avatar: undefined });
        }
      } else if (variables.entityType === 'agent') {
        utils.agent.invalidate();
      }
    },
  });
}
