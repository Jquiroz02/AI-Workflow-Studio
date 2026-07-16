import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { Document } from "@/types/api";

const ACTIVE_STATUSES = new Set(["pending", "processing"]);

export function useDocumentsQuery(projectId: string | undefined) {
  const api = useApiClient();

  return useQuery({
    queryKey: queryKeys.documents(projectId ?? "unknown"),
    queryFn: async () => (await api.get<Document[]>(`/projects/${projectId}/documents`)).data,
    enabled: Boolean(projectId),
    // Poll while any document is still being ingested so status badges update live.
    refetchInterval: (query) => {
      const documents = query.state.data;
      const hasActiveDocument = documents?.some((doc) => ACTIVE_STATUSES.has(doc.status));
      return hasActiveDocument ? 2000 : false;
    },
  });
}

export function useUploadDocumentMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return (
        await api.post<Document>(`/projects/${projectId}/documents`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteDocumentMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/projects/${projectId}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
