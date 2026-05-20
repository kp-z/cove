import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

export function usePresetAvatars(entityType: 'user' | 'agent' | 'channel' | 'realm') {
  return trpc.avatar.getPresetAvatars.useQuery(
    { entityType },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - presets don't change often
    }
  );
}

export function useUploadAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.uploadAvatar.useMutation({
    onSuccess: () => {
      utils.user.getById.invalidate();
      notify.success('Avatar uploaded', 'Your avatar has been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to upload avatar', error.message || 'An unexpected error occurred');
    },
  });
}

export function useSetPresetAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.setPresetAvatar.useMutation({
    onSuccess: () => {
      utils.user.getById.invalidate();
      notify.success('Avatar updated', 'Your avatar has been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update avatar', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteAvatar() {
  const utils = trpc.useUtils();

  return trpc.avatar.deleteAvatar.useMutation({
    onSuccess: () => {
      utils.user.getById.invalidate();
      notify.success('Avatar deleted', 'Your avatar has been reset to default');
    },
    onError: (error) => {
      notify.error('Failed to delete avatar', error.message || 'An unexpected error occurred');
    },
  });
}
