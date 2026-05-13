import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../services/agent.service';
import type { Agent, AgentFilters, AgentListResponse, UpdateAgentDto } from '../types/agent.types';

const agentKeys = {
  all: ['agents'] as const,
  list: (filters?: AgentFilters) => [...agentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
};

export function useAgents(filters?: AgentFilters) {
  return useQuery({
    queryKey: agentKeys.list(filters),
    queryFn: () => agentService.getAgents(filters),
    select: (data: AgentListResponse) => data.agents,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: () => agentService.getAgent(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAgentDto) => agentService.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentDto }) =>
      agentService.updateAgent(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agentService.deleteAgent(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: agentKeys.all });

      const previousLists = queryClient.getQueriesData<AgentListResponse>({
        queryKey: agentKeys.all,
      });

      queryClient.setQueriesData<AgentListResponse>(
        { queryKey: agentKeys.all },
        (old) => {
          if (!old) return old;
          const filtered = old.agents.filter((a: Agent) => a.agent_id !== id);
          return { agents: filtered, total: filtered.length };
        },
      );

      return { previousLists };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          if (data) queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}
