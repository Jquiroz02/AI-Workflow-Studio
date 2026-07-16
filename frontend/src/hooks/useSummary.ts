import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { Document } from "@/types/api";

export function useGenerateSummaryMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) =>
      (await api.post<Document>(`/projects/${projectId}/documents/${documentId}/summary`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(projectId) });
    },
  });
}
