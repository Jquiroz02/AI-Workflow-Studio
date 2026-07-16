import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentStatusBadge } from "@/components/features/documents/DocumentStatusBadge";
import type { DocumentStatus } from "@/types/api";

describe("DocumentStatusBadge", () => {
  it.each<[DocumentStatus, string]>([
    ["pending", "Pending"],
    ["processing", "Processing"],
    ["ready", "Ready"],
    ["failed", "Failed"],
  ])("renders the label for status %s", (status, label) => {
    render(<DocumentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
