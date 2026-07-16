import { FileText, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { ProjectSummary } from "@/types/api";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link to={`/dashboard/projects/${project.id}`} className="block h-full">
      <Card className="flex h-full flex-col p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
        <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
            {project.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <FileText className="size-3.5" />
            {project.document_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            {project.conversation_count}
          </span>
          <span className="ml-auto">{formatDate(project.updated_at)}</span>
        </div>
      </Card>
    </Link>
  );
}
