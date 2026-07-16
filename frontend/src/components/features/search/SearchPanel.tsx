import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { useSearchQuery } from "@/hooks/useSearch";
import { getApiErrorMessage } from "@/lib/apiClient";

export function SearchPanel({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: results, isLoading, isFetching, isError, error } = useSearchQuery(projectId, debouncedQuery);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search across all documents in this project..."
          className="pl-9"
        />
      </div>

      {debouncedQuery.trim().length > 1 && (isLoading || isFetching) && <PageSpinner label="Searching..." />}

      {isError && <ErrorBanner message={getApiErrorMessage(error)} />}

      {debouncedQuery.trim().length > 1 && !isLoading && !isError && results?.length === 0 && (
        <EmptyState icon={Search} title="No matches found" description="Try a different search term." />
      )}

      {results && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((result) => (
            <li
              key={result.chunk_id}
              className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {result.document_filename}
                </p>
                <span className="text-xs text-slate-400">{Math.round(result.similarity * 100)}% match</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">&ldquo;{result.snippet}&rdquo;</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
