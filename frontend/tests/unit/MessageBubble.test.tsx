import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageBubble } from "@/components/features/chat/MessageBubble";
import type { Message } from "@/types/api";

const baseMessage: Message = {
  id: "msg-1",
  role: "assistant",
  content: "The mitochondria is the powerhouse of the cell.",
  citations: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("MessageBubble", () => {
  it("renders message content", () => {
    render(<MessageBubble message={baseMessage} />);
    expect(screen.getByText(baseMessage.content)).toBeInTheDocument();
  });

  it("renders citations when present", () => {
    const message: Message = {
      ...baseMessage,
      citations: [
        {
          document_id: "doc-1",
          document_filename: "biology.pdf",
          chunk_id: "chunk-1",
          snippet: "Mitochondria produce ATP.",
        },
      ],
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText(/biology\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/Mitochondria produce ATP\./)).toBeInTheDocument();
  });

  it("renders nothing extra when there are no citations", () => {
    render(<MessageBubble message={baseMessage} />);
    expect(screen.queryByText(/\[1\]/)).not.toBeInTheDocument();
  });
});
