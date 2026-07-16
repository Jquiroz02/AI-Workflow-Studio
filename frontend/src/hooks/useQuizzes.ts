import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { Quiz } from "@/types/api";

export function useQuizzesQuery(projectId: string, documentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.quizzes(projectId, documentId),
    queryFn: async () =>
      (await api.get<Quiz[]>(`/projects/${projectId}/documents/${documentId}/quizzes`)).data,
    enabled: Boolean(documentId),
  });
}

export function useGenerateQuizMutation(projectId: string, documentId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionCount: number) =>
      (
        await api.post<Quiz>(`/projects/${projectId}/documents/${documentId}/quizzes`, {
          question_count: questionCount,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes(projectId, documentId) });
    },
  });
}

export function useDeleteQuizMutation(projectId: string, documentId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quizId: string) => {
      await api.delete(`/projects/${projectId}/documents/${documentId}/quizzes/${quizId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes(projectId, documentId) });
    },
  });
}
