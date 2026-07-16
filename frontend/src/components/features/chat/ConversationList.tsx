import { MessageSquarePlus, Trash2 } from "lucide-react";
import { memo } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/api";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string | null) => void;
  onDelete: (conversationId: string) => void;
}

// ChatPanel re-renders on every keystroke (the input box is its own state),
// and renders two instances of this list (desktop sidebar + mobile history
// modal); memoizing it means neither re-renders while you're just typing,
// since ChatPanel now passes a stable props object unless the conversation
// list or selection actually changed.
export const ConversationList = memo(function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <button
        onClick={() => onSelect(null)}
        className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <MessageSquarePlus className="size-4" /> New chat
      </button>

      {conversations.length === 0 ? (
        <EmptyState icon={MessageSquarePlus} title="No conversations yet" />
      ) : (
        <ul className="space-y-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="group relative">
              <button
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "w-full truncate rounded-lg px-3 py-2 pr-8 text-left text-sm transition-colors",
                  activeConversationId === conversation.id
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                {conversation.title}
              </button>
              <button
                onClick={() => onDelete(conversation.id)}
                aria-label="Delete conversation"
                className="absolute right-1.5 top-1.5 rounded-md p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
