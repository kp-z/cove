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
  return trpc.adapter.getById.useQuery({ adapterId: id }, { enabled });
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
      utils.adapter.getById.invalidate({ adapterId: variables.adapterId });
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

/**
 * Get all adapter type metadata
 */
export function useAdapterTypes() {
  return trpc.adapter.getAdapterTypes.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Get single adapter type metadata
 */
export function useAdapterType(type: 'anthropic-api' | 'openai-api' | 'claude-code-cli') {
  return trpc.adapter.getAdapterType.useQuery(
    { type },
    {
      staleTime: 60 * 60 * 1000, // 1 hour
    }
  );
}

/**
 * Get available models for an adapter
 */
export function useAdapterModels(adapterId: string | undefined, enabled = true) {
  return trpc.adapter.getAvailableModels.useQuery(
    { adapterId: adapterId! },
    {
      enabled: enabled && !!adapterId,
      staleTime: 15 * 60 * 1000, // 15 minutes
      retry: 1,
      // Don't throw on error - we'll fall back to default models
      useErrorBoundary: false,
    }
  );
}

/**
 * Discover models with temporary config (for creating new adapters)
 */
export function useDiscoverModels(
  config: {
    adapterType: 'anthropic-api' | 'openai-api' | 'claude-code-cli';
    baseURL?: string;
    apiKey?: string;
    customHeaders?: Record<string, string>;
  } | null,
  enabled = true
) {
  return trpc.adapter.discoverModels.useQuery(
    config!,
    {
      enabled: enabled && !!config && !!config.apiKey,
      staleTime: 15 * 60 * 1000, // 15 minutes
      retry: 1,
      // Don't throw on error - we'll fall back to default models
      useErrorBoundary: false,
    }
  );
}

/**
 * Test adapter connection
 */
export function useTestConnection() {
  return trpc.adapter.testConnection.useMutation();
}
