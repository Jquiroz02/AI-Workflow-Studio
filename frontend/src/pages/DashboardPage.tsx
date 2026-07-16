import { FolderOpen, Plus } from "lucide-react";
import { useState } from "react";

import { CreateProjectModal } from "@/components/features/projects/CreateProjectModal";
import { ProjectCard } from "@/components/features/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";
import { useProjectsQuery } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/apiClient";

export function DashboardPage() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const { data: projects, isLoading, isError, error } = useProjectsQuery();

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize documents and chat with them by project. Sorted by recent activity.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New project
        </Button>
      </div>

      <div className="mt-6">
        {isLoading && <PageSpinner label="Loading projects..." />}
        {isError && <ErrorBanner message={getApiErrorMessage(error)} />}

        {projects && projects.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create a project to start uploading documents."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> New project
              </Button>
            }
          />
        )}

        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms`, animationFillMode: "backwards" }}
              >
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
