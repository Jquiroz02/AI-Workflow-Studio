import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DemoPage } from "@/pages/DemoPage";

function renderDemo(initialEntry = "/demo") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DemoPage />
    </MemoryRouter>,
  );
}

describe("DemoPage", () => {
  it("defaults to the Documents tab with sample documents", () => {
    renderDemo();
    expect(screen.getByText("cell-structure-lecture-notes.pdf")).toBeInTheDocument();
  });

  it("opens directly on the tab requested via ?tab=", () => {
    renderDemo("/demo?tab=Flashcards");
    expect(screen.getByText(/question/i)).toBeInTheDocument();
  });

  it("lets a visitor send a chat message and get a canned reply", async () => {
    const user = userEvent.setup();
    renderDemo("/demo?tab=Chat");

    expect(screen.getByText("What does the mitochondria do?")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, "Tell me about photosynthesis");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Tell me about photosynthesis")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText(/photosynthesis converts light energy/i).length).toBeGreaterThan(0),
    );
  });

  it("filters search results as you type", async () => {
    const user = userEvent.setup();
    renderDemo("/demo?tab=Search");

    const input = screen.getByPlaceholderText(/search across all documents/i);
    await user.clear(input);
    await user.type(input, "chloroplast");

    expect(await screen.findByText(/endosymbiotic theory/i)).toBeInTheDocument();
  });
});
