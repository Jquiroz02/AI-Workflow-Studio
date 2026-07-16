import { Check, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";
import { useDeleteQuizMutation, useGenerateQuizMutation, useQuizzesQuery } from "@/hooks/useQuizzes";
import { getApiErrorMessage } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/api";

export function QuizPanel({ projectId, documentId }: { projectId: string; documentId: string }) {
  const { data: quizzes, isLoading, isError, error } = useQuizzesQuery(projectId, documentId);
  const generateMutation = useGenerateQuizMutation(projectId, documentId);
  const deleteMutation = useDeleteQuizMutation(projectId, documentId);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const activeQuiz = quizzes?.find((quiz) => quiz.id === activeQuizId) ?? quizzes?.[0];

  if (isLoading) return <PageSpinner label="Loading quizzes..." />;
  if (isError) return <ErrorBanner message={getApiErrorMessage(error)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {quizzes?.length ? `${quizzes.length} quiz${quizzes.length > 1 ? "zes" : ""} generated` : "No quizzes yet."}
        </p>
        <Button
          size="sm"
          variant="secondary"
          isLoading={generateMutation.isPending}
          onClick={() => generateMutation.mutate(5)}
        >
          <Sparkles className="size-3.5" />
          Generate quiz
        </Button>
      </div>

      {generateMutation.isError && <ErrorBanner message={getApiErrorMessage(generateMutation.error)} />}
      {deleteMutation.isError && <ErrorBanner message={getApiErrorMessage(deleteMutation.error)} />}

      {quizzes && quizzes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {quizzes.map((quiz) => (
            <button
              key={quiz.id}
              onClick={() => setActiveQuizId(quiz.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                (activeQuizId ?? quizzes[0]?.id) === quiz.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {new Date(quiz.created_at).toLocaleTimeString()}
            </button>
          ))}
        </div>
      )}

      {activeQuiz && (
        <div className="space-y-4">
          {activeQuiz.questions.map((question, index) => (
            <QuizQuestionCard key={question.id} index={index} question={question} />
          ))}
          <button
            onClick={() => deleteMutation.mutate(activeQuiz.id)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="size-3" /> Delete this quiz
          </button>
        </div>
      )}
    </div>
  );
}

export function QuizQuestionCard({ index, question }: { index: number; question: QuizQuestion }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {index + 1}. {question.question}
      </p>
      <div className="mt-3 space-y-1.5">
        {question.choices.map((choice, choiceIndex) => {
          const isSelected = selected === choiceIndex;
          const isCorrect = choiceIndex === question.correct_index;
          const showResult = selected !== null;

          return (
            <button
              key={choiceIndex}
              disabled={showResult}
              onClick={() => setSelected(choiceIndex)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !showResult && "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800",
                showResult && isCorrect && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
                showResult && isSelected && !isCorrect && "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
                showResult && !isSelected && !isCorrect && "border-slate-200 opacity-60 dark:border-slate-800",
              )}
            >
              <span>{choice}</span>
              {showResult && isCorrect && <Check className="size-4 text-emerald-600 dark:text-emerald-400" />}
              {showResult && isSelected && !isCorrect && <X className="size-4 text-red-600 dark:text-red-400" />}
            </button>
          );
        })}
      </div>
      {selected !== null && question.explanation && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{question.explanation}</p>
      )}
    </div>
  );
}
