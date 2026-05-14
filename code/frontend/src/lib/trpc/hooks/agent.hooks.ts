import { trpc } from '@/lib/trpc';

export const agentKeys = {
  all: ['agents'] as const,
  list: (filters?: any) => [...agentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
};

export function useAgents(filters?: any) {
  return trpc.agent.list.useQuery(undefined, {
    queryKey: agentKeys.list(filters),
    select: (data) => data.agents,
  });
}

export function useAgent(id: string) {
  return trpc.agent.getById.useQuery(
    { agentId: id },
    {
      queryKey: agentKeys.detail(id),
      enabled: !!id,
    }
  );
}

export function useCreateAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.create.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate();
    },
  });
}

export function useUpdateAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.updateRuntime.useMutation({
    onSuccess: (_result, variables) => {
      utils.agent.getById.invalidate({ agentId: variables.agentId });
      utils.agent.list.invalidate();
    },
  });
}

export function useDeleteAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.delete.useMutation({
    onMutate: async (agentId: string) => {
      await utils.agent.list.cancel();

      const previousData = utils.agent.list.getData();

      utils.agent.list.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          agents: old.agents.filter((a: any) => a.agent_id !== agentId),
          total: old.total - 1,
        };
      });

      return { previousData };
    },
    onError: (_err, _agentId, context) => {
      if (context?.previousData) {
        utils.agent.list.setData(undefined, context.previousData);
      }
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
    },
  });
}

export function useStopAgent() {
  const utils = trpc.useUtils();

  return trpc.agent.stop.useMutation({
    onSuccess: (_result, variables) => {
      utils.agent.getById.invalidate({ agentId: variables.agentId });
    },
  });
}
