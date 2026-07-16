import { ArrowLeft, FileText, Search, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DocumentStatusBadge } from "@/components/features/documents/DocumentStatusBadge";
import { FlashcardDeck } from "@/components/features/documents/FlashcardsPanel";
import { QuizQuestionCard } from "@/components/features/documents/QuizPanel";
import { MessageBubble } from "@/components/features/chat/MessageBubble";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  demoCannedReplies,
  demoDocuments,
  demoFlashcardSet,
  demoMessages,
  demoProject,
  demoQuiz,
  demoSearchResults,
} from "@/lib/demoData";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import type { Message } from "@/types/api";

const tabs = ["Documents", "Chat", "Flashcards", "Quiz", "Search"] as const;
type Tab = (typeof tabs)[number];

function isTab(value: string | null): value is Tab {
  return (tabs as readonly string[]).includes(value ?? "");
}

export function DemoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: Tab = isTab(requestedTab) ? requestedTab : "Documents";

  const setActiveTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="size-4" /> Home
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
              <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
              {demoProject.name}
            </span>
            <Badge tone="info">Demo</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/sign-up">
              <Button size="sm">Sign up to use your own documents</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-3">
        <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
          You&apos;re viewing sample data — nothing here is uploaded, saved, or sent to a real AI
          model. Sign up to try it with your own documents.
        </p>
      </div>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="pt-6">
          {activeTab === "Documents" && <DemoDocuments />}
          {activeTab === "Chat" && <DemoChat />}
          {activeTab === "Flashcards" && <DemoFlashcards />}
          {activeTab === "Quiz" && <DemoQuiz />}
          {activeTab === "Search" && <DemoSearch />}
        </div>
      </main>
    </div>
  );
}

function DemoDocuments() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Documents you upload get extracted, chunked, and embedded automatically — status updates
        live as each step finishes.
      </p>
      <ul className="space-y-1.5">
        {demoDocuments.map((document) => (
          <li
            key={document.id}
            className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
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
          </li>
        ))}
      </ul>

      {demoDocuments[0].summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Summary — {demoDocuments[0].original_filename}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{demoDocuments[0].summary}</p>
        </div>
      )}
    </div>
  );
}

function DemoChat() {
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [input, setInput] = useState("");
  const [isThinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isThinking]);

  const handleSend = () => {
    const question = input.trim();
    if (!question || isThinking) return;
    setInput("");

    const userMessage: Message = {
      id: `demo-msg-${Date.now()}`,
      role: "user",
      content: question,
      citations: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setThinking(true);

    const canned = demoCannedReplies.find((entry) =>
      question.toLowerCase().includes(entry.match),
    );

    // Simulated latency so the demo feels like a real round trip, not a
    // static transcript - no network call, no OpenAI key required.
    setTimeout(() => {
      const answer: Message = {
        id: `demo-msg-${Date.now() + 1}`,
        role: "assistant",
        content:
          canned?.reply ??
          "This is a canned demo response — in the real app, this answer would be grounded in " +
            "your actual uploaded documents with citations back to the source text. Try asking " +
            'about "photosynthesis" or "nucleus" for another example.',
        citations: canned
          ? [
              {
                document_id: demoDocuments[1].id,
                document_filename: demoDocuments[1].original_filename,
                chunk_id: `demo-chunk-${Date.now()}`,
                snippet: canned.reply,
              },
            ]
          : null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, answer]);
      setThinking(false);
    }, 700);
  };

  return (
    <div className="flex h-[28rem] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isThinking && <p className="pl-1 text-xs text-slate-400">Thinking...</p>}
      </div>

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
          placeholder='Ask a question (try "photosynthesis" or "nucleus")...'
          className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <Button type="submit" disabled={!input.trim() || isThinking} isLoading={isThinking} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function DemoFlashcards() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {demoFlashcardSet.cards.length} cards generated from {demoDocuments[0].original_filename}
      </p>
      <FlashcardDeck cards={demoFlashcardSet.cards} />
    </div>
  );
}

function DemoQuiz() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {demoQuiz.questions.length} questions generated from {demoDocuments[0].original_filename}
      </p>
      {demoQuiz.questions.map((question, index) => (
        <QuizQuestionCard key={question.id} index={index} question={question} />
      ))}
    </div>
  );
}

function DemoSearch() {
  const [query, setQuery] = useState("mitochondria");

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];
    return demoSearchResults.filter(
      (result) =>
        result.snippet.toLowerCase().includes(trimmed) ||
        result.document_filename.toLowerCase().includes(trimmed) ||
        "mitochondria photosynthesis chloroplast endosymbiotic".includes(trimmed),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search across all documents in this project..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {results.length === 0 && query.trim().length > 1 && (
        <p className="py-8 text-center text-sm text-slate-400">No matches found.</p>
      )}

      {results.length > 0 && (
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
