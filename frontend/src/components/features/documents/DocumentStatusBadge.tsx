import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { DocumentStatus } from "@/types/api";

const config: Record<DocumentStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Pending", tone: "neutral" },
  processing: { label: "Processing", tone: "info" },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { label, tone } = config[status];
  return (
    <Badge tone={tone}>
      {status === "processing" && <Loader2 className="size-3 animate-spin" />}
      {label}
    </Badge>
  );
}
