import { ArrowRight, BookOpen, FileText, MessageSquare, Sparkles, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { SignedIn, SignedOut } from "@/lib/auth";

const features = [
  {
    icon: UploadCloud,
    title: "Upload anything",
    description: "Drop in PDFs or text files and organize them into projects.",
    demoTab: "Documents",
  },
  {
    icon: MessageSquare,
    title: "Chat with your documents",
    description: "Ask questions and get answers grounded in your files, with citations.",
    demoTab: "Chat",
  },
  {
    icon: FileText,
    title: "Instant summaries",
    description: "Turn a 40-page document into a few clear paragraphs.",
    demoTab: "Documents",
  },
  {
    icon: BookOpen,
    title: "Flashcards & quizzes",
    description: "Auto-generate study material from anything you upload.",
    demoTab: "Flashcards",
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles className="size-4" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">AI Workflow Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/demo">
            <Button variant="ghost" size="sm">
              View demo
            </Button>
          </Link>
          <SignedOut>
            <Link to="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          </SignedIn>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          Turn your documents into a{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            knowledge base you can talk to
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Upload PDFs and notes, ask questions in plain English, and get summaries, flashcards, and
          quizzes generated automatically — powered by retrieval-augmented generation.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <SignedOut>
            <Link to="/sign-up">
              <Button size="lg">Get started</Button>
            </Link>
            <Link to="/sign-in">
              <Button size="lg" variant="secondary">
                Sign in
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="lg">Go to dashboard</Button>
            </Link>
          </SignedIn>
          <Link to="/demo">
            <Button size="lg" variant="secondary">
              View demo
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description, demoTab }) => (
            <Link
              key={title}
              to={`/demo?tab=${demoTab}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                <Icon className="size-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Try it in the demo
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
