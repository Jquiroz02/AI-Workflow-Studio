import { ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  useDeleteFlashcardSetMutation,
  useFlashcardSetsQuery,
  useGenerateFlashcardsMutation,
} from "@/hooks/useFlashcards";
import { getApiErrorMessage } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export function FlashcardsPanel({ projectId, documentId }: { projectId: string; documentId: string }) {
  const { data: sets, isLoading, isError, error } = useFlashcardSetsQuery(projectId, documentId);
  const generateMutation = useGenerateFlashcardsMutation(projectId, documentId);
  const deleteMutation = useDeleteFlashcardSetMutation(projectId, documentId);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  const activeSet = sets?.find((set) => set.id === activeSetId) ?? sets?.[0];

  if (isLoading) return <PageSpinner label="Loading flashcards..." />;
  if (isError) return <ErrorBanner message={getApiErrorMessage(error)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {sets?.length ? `${sets.length} set${sets.length > 1 ? "s" : ""} generated` : "No flashcards yet."}
        </p>
        <Button
          size="sm"
          variant="secondary"
          isLoading={generateMutation.isPending}
          onClick={() => generateMutation.mutate(10)}
        >
          <Sparkles className="size-3.5" />
          Generate flashcards
        </Button>
      </div>

      {generateMutation.isError && <ErrorBanner message={getApiErrorMessage(generateMutation.error)} />}
      {deleteMutation.isError && <ErrorBanner message={getApiErrorMessage(deleteMutation.error)} />}

      {sets && sets.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => setActiveSetId(set.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                (activeSetId ?? sets[0]?.id) === set.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {new Date(set.created_at).toLocaleTimeString()}
            </button>
          ))}
        </div>
      )}

      {activeSet && (
        <div className="space-y-3">
          {/* key resets FlashcardDeck's internal index/flip state when the
              active set changes - without it, switching from a larger set
              to a smaller one while deep in the deck leaves a stale index
              pointing past the end of the new cards array. */}
          <FlashcardDeck key={activeSet.id} cards={activeSet.cards} />
          <button
            onClick={() => deleteMutation.mutate(activeSet.id)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="size-3" /> Delete this set
          </button>
        </div>
      )}
    </div>
  );
}

export function FlashcardDeck({ cards }: { cards: { question: string; answer: string }[] }) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setFlipped] = useState(false);

  if (cards.length === 0) return null;
  const card = cards[index];

  const goTo = (next: number) => {
    setIndex((next + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-40 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
      >
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            {isFlipped ? "Answer" : "Question"}
          </p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {isFlipped ? card.answer : card.question}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => goTo(index - 1)}>
          <ChevronLeft className="size-4" /> Prev
        </Button>
        <span className="text-xs text-slate-400">
          {index + 1} / {cards.length}
        </span>
        <Button size="sm" variant="ghost" onClick={() => goTo(index + 1)}>
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
