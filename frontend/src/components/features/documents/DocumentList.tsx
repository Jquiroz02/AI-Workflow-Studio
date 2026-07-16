import { FileText, Trash2 } from "lucide-react";

import { DocumentStatusBadge } from "@/components/features/documents/DocumentStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/api";

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | undefined;
  onSelect: (document: Document) => void;
  onDelete: (document: Document) => void;
}

export function DocumentList({ documents, selectedDocumentId, onSelect, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload a PDF or text file to get started."
      />
    );
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((document) => (
        <li
          key={document.id}
          className={cn(
            "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
            selectedDocumentId === document.id
              ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40"
              : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
          )}
        >
          <button
            onClick={() => onSelect(document)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <FileText className="size-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {document.original_filename}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatFileSize(document.file_size_bytes)} &middot; {formatDate(document.created_at)}
              </p>
            </div>
            <DocumentStatusBadge status={document.status} />
          </button>
          <button
            onClick={() => onDelete(document)}
            aria-label={`Delete ${document.original_filename}`}
            className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
