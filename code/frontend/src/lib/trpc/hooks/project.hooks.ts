import { trpc } from '@/lib/trpc';

export function useProjects() {
  return trpc.project.list.useQuery();
}

export function useProject(projectId: string) {
  return trpc.project.getById.useQuery(
    { projectId },
    {
      enabled: !!projectId,
    }
  );
}

export function useCreateProject() {
  const utils = trpc.useUtils();

  return trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
    },
  });
}

export function useUpdateProject() {
  const utils = trpc.useUtils();

  return trpc.project.update.useMutation({
    onSuccess: (_result, variables) => {
      utils.project.getById.invalidate({ projectId: variables.projectId });
      utils.project.list.invalidate();
    },
  });
}

export function useDeleteProject() {
  const utils = trpc.useUtils();

  return trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
    },
  });
}
