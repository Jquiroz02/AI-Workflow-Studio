import { AlertOctagon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled error in component tree:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-950/50">
            <AlertOctagon className="size-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Something went wrong
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            An unexpected error occurred. Try reloading the page — if it keeps happening, please let
            us know.
          </p>
          <Button size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
