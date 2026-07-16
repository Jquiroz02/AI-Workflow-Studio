export const queryKeys = {
  projects: ["projects"] as const,
  project: (projectId: string) => ["projects", projectId] as const,
  documents: (projectId: string) => ["projects", projectId, "documents"] as const,
  conversations: (projectId: string) => ["projects", projectId, "conversations"] as const,
  conversation: (projectId: string, conversationId: string | undefined) =>
    ["projects", projectId, "conversations", conversationId ?? "unknown"] as const,
  flashcardSets: (projectId: string, documentId: string | undefined) =>
    ["projects", projectId, "documents", documentId ?? "unknown", "flashcards"] as const,
  quizzes: (projectId: string, documentId: string | undefined) =>
    ["projects", projectId, "documents", documentId ?? "unknown", "quizzes"] as const,
  search: (projectId: string, q: string) => ["projects", projectId, "search", q] as const,
};
