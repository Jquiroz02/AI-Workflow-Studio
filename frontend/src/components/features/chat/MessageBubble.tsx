import { cn } from "@/lib/utils";
import type { Message } from "@/types/api";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.citations && message.citations.length > 0 && (
          <div
            className={cn(
              "mt-2 space-y-1 border-t pt-2",
              isUser ? "border-white/20" : "border-slate-300/50 dark:border-slate-600/50",
            )}
          >
            {message.citations.map((citation, i) => (
              <p key={citation.chunk_id} className="text-xs opacity-75">
                [{i + 1}] {citation.document_filename}: &ldquo;{citation.snippet}&rdquo;
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
