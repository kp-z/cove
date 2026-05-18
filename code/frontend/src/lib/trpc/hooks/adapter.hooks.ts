/**
 * Adapter tRPC Hooks
 */

import { trpc } from '@/lib/trpc';

/**
 * Get all adapter configurations
 */
export function useAdapters() {
  return trpc.adapter.list.useQuery();
}

/**
 * Get adapter by ID
 */
export function useAdapter(id: string, enabled = true) {
  return trpc.adapter.getById.useQuery({ id }, { enabled });
}

/**
 * Get adapters by scope
 */
export function useAdaptersByScope(scope: 'shared' | 'private', ownerId?: string) {
  return trpc.adapter.listByScope.useQuery({ scope, owner_id: ownerId });
}

/**
 * Create adapter configuration
 */
export function useCreateAdapter() {
  const utils = trpc.useUtils();
  return trpc.adapter.create.useMutation({
    onSuccess: () => {
      utils.adapter.list.invalidate();
    },
  });
}

/**
 * Update adapter configuration
 */
export function useUpdateAdapter() {
  const utils = trpc.useUtils();
  return trpc.adapter.update.useMutation({
    onSuccess: (_, variables) => {
      utils.adapter.getById.invalidate({ id: variables.id });
      utils.adapter.list.invalidate();
    },
  });
}

/**
 * Delete adapter configuration
 */
export function useDeleteAdapter() {
  const utils = trpc.useUtils();
  return trpc.adapter.delete.useMutation({
    onSuccess: () => {
      utils.adapter.list.invalidate();
    },
  });
}
