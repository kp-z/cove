import { trpc } from '@/lib/trpc';

export function useWorkflows(filters?: { projectId?: string; status?: string }) {
  return trpc.workflow.list.useQuery(filters, {
    queryKey: ['workflows', filters],
  });
}

export function useWorkflow(workflowId: string) {
  return trpc.workflow.getById.useQuery(
    { workflowId },
    {
      enabled: !!workflowId,
    }
  );
}

export function useCreateWorkflow() {
  const utils = trpc.useUtils();

  return trpc.workflow.create.useMutation({
    onSuccess: () => {
      utils.workflow.list.invalidate();
    },
  });
}

export function useUpdateWorkflow() {
  const utils = trpc.useUtils();

  return trpc.workflow.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.workflow.getById.invalidate({ workflowId: variables.workflowId });
      utils.workflow.list.invalidate();
    },
  });
}

export function useDeleteWorkflow() {
  const utils = trpc.useUtils();

  return trpc.workflow.delete.useMutation({
    onSuccess: () => {
      utils.workflow.list.invalidate();
    },
  });
}

export function useExecuteWorkflow() {
  const utils = trpc.useUtils();

  return trpc.workflow.execute.useMutation({
    onSuccess: (_result, variables) => {
      utils.workflow.getById.invalidate({ workflowId: variables.workflowId });
    },
  });
}
