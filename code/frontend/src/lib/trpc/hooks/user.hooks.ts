import { trpc } from '@/lib/trpc';

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
    },
  });
}

export function useUpdateUser() {
  const utils = trpc.useUtils();

  return trpc.user.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.user.getById.invalidate({ userId: variables.userId });
      utils.user.list.invalidate();
    },
  });
}

export function useDeleteUser() {
  const utils = trpc.useUtils();

  return trpc.user.delete.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
    },
  });
}
