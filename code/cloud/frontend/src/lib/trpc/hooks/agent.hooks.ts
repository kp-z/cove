import { trpc } from '@/lib/trpc';
import { notify } from '@/core/services/notificationService';

type AgentFilters = Record<string, unknown> | undefined;

export const agentKeys = {
  all: ['agents'] as const,
  list: (filters?: AgentFilters) => [...agentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
};

export function useAgents(filters?: AgentFilters) {
  return trpc.agent.list.useQuery(undefined, {
    queryKey: agentKeys.list(filters),
  });
}

export function useAgent(id: string, options?: { enabled?: boolean }) {
  return trpc.agent.getById.useQuery(
    { agentId: id },
    {
      queryKey: agentKeys.detail(id),
      enabled: options?.enabled !== undefined ? options.enabled : !!id,
    }
  );
}

export function useCreateAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.create.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate();
      notify.toast.success('Agent created', 'The agent has been created successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to create agent', error.message || 'An unexpected error occurred');
    },
  });
}

export function useUpdateAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.agent.getById.invalidate({ agentId: variables.agentId });
      utils.agent.list.invalidate();
      notify.toast.success('Agent updated', 'The agent has been updated successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to update agent', error.message || 'An unexpected error occurred');
    },
  });
}

export function useDeleteAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.delete.useMutation({
    onMutate: async (variables) => {
      await utils.agent.list.cancel();

      const previousData = utils.agent.list.getData();

      utils.agent.list.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          agents: old.agents.filter((a) => a.agent_id !== variables.agentId),
          total: old.total - 1,
        };
      });

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        utils.agent.list.setData(undefined, context.previousData);
      }
      notify.toast.error('Failed to delete agent', error.message || 'An unexpected error occurred');
    },
    onSuccess: () => {
      notify.toast.success('Agent deleted', 'The agent has been deleted successfully');
    },
    onSettled: () => {
      utils.agent.list.invalidate();
    },
  });
}

export function useStartAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.start.useMutation({
    onSuccess: (_result, variables) => {
      utils.agent.getById.invalidate({ agentId: variables.agentId });
      notify.toast.success('Agent started', 'The agent has been started successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to start agent', error.message || 'An unexpected error occurred');
    },
  });
}

export function useStopAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.stop.useMutation({
    onSuccess: (_result, variables) => {
      utils.agent.getById.invalidate({ agentId: variables.agentId });
      notify.toast.success('Agent stopped', 'The agent has been stopped successfully');
    },
    onError: (error) => {
      notify.toast.error('Failed to stop agent', error.message || 'An unexpected error occurred');
    },
  });
}
