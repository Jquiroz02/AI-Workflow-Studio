import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCreateProjectMutation } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/apiClient";

export function CreateProjectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const mutation = useCreateProjectMutation();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const project = await mutation.mutateAsync({ name, description: description || undefined });
      setName("");
      setDescription("");
      onClose();
      navigate(`/dashboard/projects/${project.id}`);
    } catch {
      // mutation.isError already renders the ErrorBanner below; swallow here
      // so a failed create doesn't surface as an unhandled promise rejection.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New project">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mutation.isError && <ErrorBanner message={getApiErrorMessage(mutation.error)} />}
        <div>
          <label
            htmlFor="project-name"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Name
          </label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            placeholder="e.g. Biology 101"
          />
        </div>
        <div>
          <label
            htmlFor="project-description"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Description (optional)
          </label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="What is this project for?"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
