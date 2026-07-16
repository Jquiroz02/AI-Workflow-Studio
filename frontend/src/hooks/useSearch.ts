import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { DocumentSearchResult } from "@/types/api";

export function useSearchQuery(projectId: string, q: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.search(projectId, q),
    queryFn: async () =>
      (
        await api.get<DocumentSearchResult[]>(`/projects/${projectId}/search`, {
          params: { q },
        })
      ).data,
    enabled: q.trim().length > 1,
  });
}
