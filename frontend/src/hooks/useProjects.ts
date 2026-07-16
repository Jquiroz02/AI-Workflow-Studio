import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { Project, ProjectSummary } from "@/types/api";

export function useProjectsQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => (await api.get<ProjectSummary[]>("/projects")).data,
  });
}

export function useProjectQuery(projectId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ["projects", "unknown"],
    queryFn: async () => (await api.get<Project>(`/projects/${projectId}`)).data,
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) =>
      (await api.post<Project>("/projects", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProjectMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name?: string; description?: string }) =>
      (await api.patch<Project>(`/projects/${projectId}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useDeleteProjectMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}
