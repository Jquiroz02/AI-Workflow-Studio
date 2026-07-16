import { useMemo } from "react";

import { createApiClient } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";

export function useApiClient() {
  const { getToken } = useAuth();
  return useMemo(() => createApiClient(getToken), [getToken]);
}
