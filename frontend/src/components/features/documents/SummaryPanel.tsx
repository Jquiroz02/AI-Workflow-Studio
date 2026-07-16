import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getApiErrorMessage } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/utils";
import { useGenerateSummaryMutation } from "@/hooks/useSummary";
import type { Document } from "@/types/api";

export function SummaryPanel({ projectId, document }: { projectId: string; document: Document }) {
  const mutation = useGenerateSummaryMutation(projectId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {document.summary_generated_at
            ? `Generated ${formatDateTime(document.summary_generated_at)}`
            : "No summary yet."}
        </p>
        <Button
          size="sm"
          variant="secondary"
          isLoading={mutation.isPending}
          onClick={() => mutation.mutate(document.id)}
        >
          <Sparkles className="size-3.5" />
          {document.summary ? "Regenerate" : "Generate summary"}
        </Button>
      </div>

      {mutation.isError && <ErrorBanner message={getApiErrorMessage(mutation.error)} />}

      {document.summary ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {document.summary}
        </p>
      ) : (
        !mutation.isPending && (
          <p className="text-sm text-slate-400">Click "Generate summary" to summarize this document.</p>
        )
      )}
    </div>
  );
}
