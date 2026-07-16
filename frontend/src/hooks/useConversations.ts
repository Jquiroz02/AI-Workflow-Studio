import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/hooks/useApiClient";
import { queryKeys } from "@/lib/queryKeys";
import type { AnswerMode, ChatResponse, Conversation, ConversationWithMessages } from "@/types/api";

export function useConversationsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.conversations(projectId),
    queryFn: async () =>
      (await api.get<Conversation[]>(`/projects/${projectId}/conversations`)).data,
  });
}

export function useConversationQuery(projectId: string, conversationId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.conversation(projectId, conversationId),
    queryFn: async () =>
      (
        await api.get<ConversationWithMessages>(
          `/projects/${projectId}/conversations/${conversationId}`,
        )
      ).data,
    enabled: Boolean(conversationId),
  });
}

export function useDeleteConversationMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await api.delete(`/projects/${projectId}/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(projectId) });
    },
  });
}

export function useSendChatMessageMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      message: string;
      conversationId?: string;
      documentId?: string;
      answerMode?: AnswerMode;
    }) =>
      (
        await api.post<ChatResponse>(`/projects/${projectId}/chat`, {
          message: payload.message,
          conversation_id: payload.conversationId ?? null,
          document_id: payload.documentId ?? null,
          answer_mode: payload.answerMode ?? "document_only",
        })
      ).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(projectId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversation(projectId, data.conversation_id),
      });
    },
  });
}
