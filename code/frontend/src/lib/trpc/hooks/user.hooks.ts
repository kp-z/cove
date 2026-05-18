import { trpc } from '@/lib/trpc';
import { notify } from '@/core/stores/notificationStore';

export function useUsers(filters?: { role?: string }) {
  return trpc.user.list.useQuery(filters, {
    queryKey: ['users', filters],
  });
}

export function useUser(userId: string) {
  return trpc.user.getById.useQuery(
    { userId },
    {
      enabled: !!userId,
    }
  );
}

export function useCreateUser() {
  const utils = trpc.useUtils();

  return trpc.user.create.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      notify.success('User created', 'The user has been created successfully');
    },
    onError: (error) => {
      notify.error('Failed to create user', error.message || 'An unexpected error occurred');
    },
  });
}

export function useUpdateUser() {
  const utils = trpc.useUtils();

  return trpc.user.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.user.getById.invalidate({ userId: variables.userId });
      utils.user.list.invalidate();
      notify.success('User updated', 'The user has been updated successfully');
    },
    onError: (error) => {
      notify.error('Failed to update user', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteUser() {
  const utils = trpc.useUtils();

  return trpc.user.delete.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      notify.success('User deleted', 'The user has been deleted successfully');
    },
    onError: (error) => {
      notify.error('Failed to delete user', error.message || 'An unexpected error occurred');
    },
  });
}
