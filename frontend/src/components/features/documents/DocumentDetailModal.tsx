import { useState } from "react";
import { createPortal } from "react-dom";

import { DocumentStatusBadge } from "@/components/features/documents/DocumentStatusBadge";
import { FlashcardsPanel } from "@/components/features/documents/FlashcardsPanel";
import { QuizPanel } from "@/components/features/documents/QuizPanel";
import { SummaryPanel } from "@/components/features/documents/SummaryPanel";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/api";
import { X } from "lucide-react";

const tabs = ["Summary", "Flashcards", "Quiz"] as const;
type Tab = (typeof tabs)[number];

export function DocumentDetailModal({
  projectId,
  document,
  onClose,
}: {
  projectId: string;
  document: Document;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Summary");
  const isReady = document.status === "ready";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-2xl animate-scale-in flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{document.original_filename}</h2>
            <div className="mt-1">
              <DocumentStatusBadge status={document.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="size-4" />
          </button>
        </div>

        {!isReady ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {document.status === "failed"
              ? `Processing failed: ${document.processing_error ?? "unknown error"}`
              : "This document is still being processed. Summary, flashcards, and quizzes will be available once it's ready."}
          </div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-slate-200 px-5 pt-3 dark:border-slate-800">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === tab
                      ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {activeTab === "Summary" && <SummaryPanel projectId={projectId} document={document} />}
              {activeTab === "Flashcards" && (
                <FlashcardsPanel projectId={projectId} documentId={document.id} />
              )}
              {activeTab === "Quiz" && <QuizPanel projectId={projectId} documentId={document.id} />}
            </div>
          </>
        )}
      </div>
    </div>,
    globalThis.document.body,
  );
}
