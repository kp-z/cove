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
      utils.agent.invalidate();
      utils.user.invalidate();

      // Update authStore if uploading for current user
      if (variables.entityType === 'user') {
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.id === variables.entityId) {
          updateUser({ avatar: data.avatarUrl });
        }
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
      utils.agent.invalidate();
      utils.user.invalidate();

      // Update authStore if setting for current user
      if (variables.entityType === 'user') {
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.id === variables.entityId) {
          updateUser({ avatar: data.avatarUrl });
        }
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
      utils.agent.invalidate();
      utils.user.invalidate();

      // Update authStore if deleting for current user
      if (variables.entityType === 'user') {
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.id === variables.entityId) {
          updateUser({ avatar: undefined });
        }
      }
    },
  });
}
