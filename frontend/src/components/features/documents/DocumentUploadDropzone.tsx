import { UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["application/pdf", "text/plain"];

interface DocumentUploadDropzoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export function DocumentUploadDropzone({ onUpload, isUploading }: DocumentUploadDropzoneProps) {
  const [isDragging, setDragging] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setRejectionError(`"${file.name}" isn't a supported file type. Upload a PDF or .txt file.`);
      return;
    }
    setRejectionError(null);
    onUpload(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        {isUploading ? (
          <>
            <Spinner />
            <p className="text-sm text-slate-500 dark:text-slate-400">Uploading...</p>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Drop a PDF or text file, or click to browse
            </p>
            <p className="text-xs text-slate-400">PDF or .txt, up to 20MB</p>
          </>
        )}
      </div>
      {rejectionError && <ErrorBanner message={rejectionError} />}
    </div>
  );
}
