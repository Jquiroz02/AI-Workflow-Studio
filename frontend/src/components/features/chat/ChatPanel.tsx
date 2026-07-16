import { History, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConversationList } from "@/components/features/chat/ConversationList";
import { MessageBubble } from "@/components/features/chat/MessageBubble";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  useConversationQuery,
  useConversationsQuery,
  useDeleteConversationMutation,
  useSendChatMessageMutation,
} from "@/hooks/useConversations";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { AnswerMode, Document } from "@/types/api";

const ANSWER_MODES: { value: AnswerMode; label: string }[] = [
  { value: "document_only", label: "Document only" },
  { value: "ai_knowledge", label: "AI knowledge + documents" },
];

export function ChatPanel({ projectId, documents }: { projectId: string; documents: Document[] }) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [documentFilter, setDocumentFilter] = useState<string>("");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("document_only");
  const [input, setInput] = useState("");
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data: conversations = [],
    isError: isConversationsError,
    error: conversationsError,
  } = useConversationsQuery(projectId);
  const {
    data: activeConversation,
    isLoading: isConversationLoading,
    isError: isConversationError,
    error: conversationError,
  } = useConversationQuery(projectId, activeConversationId ?? undefined);
  const sendMessage = useSendChatMessageMutation(projectId);
  const deleteConversation = useDeleteConversationMutation(projectId);

  const readyDocuments = useMemo(() => documents.filter((doc) => doc.status === "ready"), [documents]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeConversation?.messages.length, sendMessage.isPending]);

  const handleSend = async () => {
    const message = input.trim();
    // Without this guard, pressing Enter again before the first message's
    // response lands would fire a second send with conversationId still
    // undefined (it's only set in the mutation's onSuccess), creating a
    // second, separate conversation instead of continuing the first.
    if (!message || sendMessage.isPending) return;
    setInput("");
    const startingConversationId = activeConversationId;

    try {
      const result = await sendMessage.mutateAsync({
        message,
        conversationId: activeConversationId ?? undefined,
        documentId: documentFilter || undefined,
        answerMode,
      });
      // Only follow the response into its conversation if the user hasn't
      // since switched to a different conversation while this send was in flight.
      setActiveConversationId((current) =>
        current === startingConversationId ? result.conversation_id : current,
      );
    } catch {
      setInput(message);
    }
  };

  const handleSelectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    // Clear whatever was typed for the previous conversation - otherwise
    // "New chat" (which selects null) is a no-op with zero visible feedback
    // when you're already on a fresh, conversation-less compose screen, and
    // switching conversations mid-draft could carry a half-typed message
    // into the wrong thread.
    setInput("");
    setHistoryOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation.mutate(id, {
        onSuccess: () => {
          if (id === activeConversationId) setActiveConversationId(null);
        },
      });
    },
    [deleteConversation, activeConversationId],
  );

  const conversationListProps = useMemo(
    () => ({
      conversations,
      activeConversationId,
      onSelect: handleSelectConversation,
      onDelete: handleDeleteConversation,
    }),
    [conversations, activeConversationId, handleSelectConversation, handleDeleteConversation],
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] gap-4">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 pr-4 dark:border-slate-800 md:block">
        <ConversationList {...conversationListProps} />
      </aside>

      <Modal isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} title="Conversation history">
        <ConversationList {...conversationListProps} />
      </Modal>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            aria-label="Conversation history"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
          >
            <History className="size-4" />
          </button>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Scope:</label>
          <select
            value={documentFilter}
            onChange={(event) => setDocumentFilter(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All documents</option>
            {readyDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.original_filename}
              </option>
            ))}
          </select>

          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Answer:</label>
          <select
            value={answerMode}
            onChange={(event) => setAnswerMode(event.target.value as AnswerMode)}
            aria-label="Answer mode"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {ANSWER_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {isConversationsError && <ErrorBanner message={getApiErrorMessage(conversationsError)} />}

          {isConversationLoading && <PageSpinner label="Loading conversation..." />}

          {isConversationError && !isConversationLoading && (
            <ErrorBanner message={getApiErrorMessage(conversationError)} />
          )}

          {!activeConversationId && !isConversationLoading && (
            <p className="pt-8 text-center text-sm text-slate-400">
              Ask a question about your documents to start a new chat.
            </p>
          )}

          {activeConversation?.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {sendMessage.isPending && (
            <p className="pl-1 text-xs text-slate-400">Thinking...</p>
          )}
        </div>

        {sendMessage.isError && <ErrorBanner message={getApiErrorMessage(sendMessage.error)} />}
        {deleteConversation.isError && (
          <ErrorBanner message={getApiErrorMessage(deleteConversation.error)} />
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
          className="mt-3 flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={
              readyDocuments.length === 0
                ? "Upload a document before chatting"
                : "Ask a question about your documents..."
            }
            disabled={readyDocuments.length === 0 || sendMessage.isPending}
            className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button
            type="submit"
            disabled={!input.trim() || readyDocuments.length === 0 || sendMessage.isPending}
            isLoading={sendMessage.isPending}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
