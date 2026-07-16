import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
        <Icon className="size-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
