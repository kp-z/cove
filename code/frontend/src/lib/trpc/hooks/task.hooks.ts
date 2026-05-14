import { trpc } from '@/lib/trpc';

export function useTasks(filters?: {
  projectId?: string;
  channelId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}) {
  return trpc.task.list.useQuery(filters, {
    queryKey: ['tasks', filters],
  });
}

export function useTask(taskId: string) {
  return trpc.task.getById.useQuery(
    { taskId },
    {
      enabled: !!taskId,
    }
  );
}

export function useCreateTask() {
  const utils = trpc.useUtils();

  return trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
    },
  });
}

export function useUpdateTask() {
  const utils = trpc.useUtils();

  return trpc.task.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.task.getById.invalidate({ taskId: variables.taskId });
      utils.task.list.invalidate();
    },
  });
}

export function useDeleteTask() {
  const utils = trpc.useUtils();

  return trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
    },
  });
}

export function useConvertMessageToTask() {
  const utils = trpc.useUtils();

  return trpc.task.convertMessageToTask.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
    },
  });
}

export function useClaimTask() {
  const utils = trpc.useUtils();

  return trpc.task.claim.useMutation({
    onSuccess: (_result, variables) => {
      utils.task.getById.invalidate({ taskId: variables.taskId });
      utils.task.list.invalidate();
    },
  });
}

export function useUnclaimTask() {
  const utils = trpc.useUtils();

  return trpc.task.unclaim.useMutation({
    onSuccess: (_result, variables) => {
      utils.task.getById.invalidate({ taskId: variables.taskId });
      utils.task.list.invalidate();
    },
  });
}

export function useUpdateTaskStatus() {
  const utils = trpc.useUtils();

  return trpc.task.updateStatus.useMutation({
    onSuccess: (_result, variables) => {
      utils.task.getById.invalidate({ taskId: variables.taskId });
      utils.task.list.invalidate();
    },
  });
}
