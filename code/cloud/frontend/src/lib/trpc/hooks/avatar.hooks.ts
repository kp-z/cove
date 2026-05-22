/**
 * Avatar tRPC Hooks
 */

import { trpc } from '@/lib/trpc';

/**
 * Get all preset avatars
 */
export function usePresetAvatars(entityType?: 'user' | 'agent' | 'channel' | 'realm') {
  const query = trpc.avatar.getPresetAvatars.useQuery(
    entityType ? { entityType } : undefined,
    { enabled: !!entityType }
  );

  return {
    ...query,
    data: query.data?.presets || [],
  };
}

/**
 * Upload avatar mutation
 */
export function useUploadAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.uploadAvatar.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries after upload
      utils.agent.invalidate();
      utils.user.invalidate();
    },
  });
}

/**
 * Set preset avatar mutation
 */
export function useSetPresetAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.setPresetAvatar.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries after setting preset
      utils.agent.invalidate();
      utils.user.invalidate();
    },
  });
}

/**
 * Delete avatar mutation
 */
export function useDeleteAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.deleteAvatar.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries after deletion
      utils.agent.invalidate();
      utils.user.invalidate();
    },
  });
}
