import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { FlashcardSet } from "@/types/api";

export function useFlashcardSetsQuery(projectId: string, documentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.flashcardSets(projectId, documentId),
    queryFn: async () =>
      (
        await api.get<FlashcardSet[]>(
          `/projects/${projectId}/documents/${documentId}/flashcards`,
        )
      ).data,
    enabled: Boolean(documentId),
  });
}

export function useGenerateFlashcardsMutation(projectId: string, documentId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardCount: number) =>
      (
        await api.post<FlashcardSet>(
          `/projects/${projectId}/documents/${documentId}/flashcards`,
          { card_count: cardCount },
        )
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcardSets(projectId, documentId) });
    },
  });
}

export function useDeleteFlashcardSetMutation(projectId: string, documentId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setId: string) => {
      await api.delete(`/projects/${projectId}/documents/${documentId}/flashcards/${setId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcardSets(projectId, documentId) });
    },
  });
}
