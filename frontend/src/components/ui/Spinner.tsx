import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-indigo-500", className)} aria-hidden="true" />;
}

export function PageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
      <Spinner className="size-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
