import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { ChatPanel } from "@/components/features/chat/ChatPanel";
import { DocumentDetailModal } from "@/components/features/documents/DocumentDetailModal";
import { DocumentList } from "@/components/features/documents/DocumentList";
import { DocumentUploadDropzone } from "@/components/features/documents/DocumentUploadDropzone";
import { SearchPanel } from "@/components/features/search/SearchPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";
import { useDeleteDocumentMutation, useDocumentsQuery, useUploadDocumentMutation } from "@/hooks/useDocuments";
import { useDeleteProjectMutation, useProjectQuery } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

const tabs = ["Chat", "Documents", "Search"] as const;
type Tab = (typeof tabs)[number];

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Documents");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentToDeleteId, setDocumentToDeleteId] = useState<string | null>(null);
  const [isDeletingProject, setDeletingProject] = useState(false);

  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useProjectQuery(projectId);
  const { data: documents = [], isLoading: isDocumentsLoading, isError: isDocumentsError, error: documentsError } =
    useDocumentsQuery(projectId);
  const uploadMutation = useUploadDocumentMutation(projectId ?? "");
  const deleteDocumentMutation = useDeleteDocumentMutation(projectId ?? "");
  const deleteProjectMutation = useDeleteProjectMutation();

  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const documentToDelete = documents.find((document) => document.id === documentToDeleteId) ?? null;

  if (!projectId) return <Navigate to="/dashboard" replace />;
  if (isProjectError) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up p-6">
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="size-4" /> All projects
      </Link>

      {isProjectLoading && <PageSpinner label="Loading project..." />}

      {project && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
              )}
            </div>
            <button
              onClick={() => setDeletingProject(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <Trash2 className="size-3.5" /> Delete project
            </button>
          </div>

          <div className="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-800">
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

          <div className="pt-5">
            {activeTab === "Documents" && (
              <div className="space-y-4">
                <DocumentUploadDropzone
                  isUploading={uploadMutation.isPending}
                  onUpload={(file) => uploadMutation.mutate(file)}
                />
                {uploadMutation.isError && <ErrorBanner message={getApiErrorMessage(uploadMutation.error)} />}
                {isDocumentsLoading && <PageSpinner label="Loading documents..." />}
                {isDocumentsError && <ErrorBanner message={getApiErrorMessage(documentsError)} />}
                {!isDocumentsLoading && (
                  <DocumentList
                    documents={documents}
                    selectedDocumentId={selectedDocument?.id}
                    onSelect={(document) => setSelectedDocumentId(document.id)}
                    onDelete={(document) => setDocumentToDeleteId(document.id)}
                  />
                )}
              </div>
            )}

            {activeTab === "Chat" && <ChatPanel projectId={projectId} documents={documents} />}

            {activeTab === "Search" && <SearchPanel projectId={projectId} />}
          </div>
        </>
      )}

      {selectedDocument && (
        <DocumentDetailModal
          projectId={projectId}
          document={selectedDocument}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}

      {deleteDocumentMutation.isError && (
        <div className="fixed inset-x-0 bottom-4 mx-auto w-fit">
          <ErrorBanner message={getApiErrorMessage(deleteDocumentMutation.error)} />
        </div>
      )}

      <ConfirmDialog
        isOpen={documentToDelete !== null}
        title="Delete document"
        description={`Are you sure you want to delete "${documentToDelete?.original_filename}"? This cannot be undone.`}
        isLoading={deleteDocumentMutation.isPending}
        onCancel={() => setDocumentToDeleteId(null)}
        onConfirm={() => {
          if (!documentToDelete) return;
          deleteDocumentMutation.mutate(documentToDelete.id, {
            onSuccess: () => setDocumentToDeleteId(null),
          });
        }}
      />

      {deleteProjectMutation.isError && (
        <div className="fixed inset-x-0 bottom-4 mx-auto w-fit">
          <ErrorBanner message={getApiErrorMessage(deleteProjectMutation.error)} />
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeletingProject}
        title="Delete project"
        description={`Are you sure you want to delete "${project?.name}" and all of its documents, chats, flashcards, and quizzes? This cannot be undone.`}
        isLoading={deleteProjectMutation.isPending}
        onCancel={() => setDeletingProject(false)}
        onConfirm={() => {
          deleteProjectMutation.mutate(projectId, {
            onSuccess: () => navigate("/dashboard"),
          });
        }}
      />
    </div>
  );
}
