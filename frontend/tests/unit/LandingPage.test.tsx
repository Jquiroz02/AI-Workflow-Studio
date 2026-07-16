import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { LandingPage } from "@/pages/LandingPage";

// Simulates the realistic "new, signed-out visitor" state - the exact
// scenario the landing page fix targets: Sign in / Get started / View demo
// must always be reachable, not gated behind Clerk finishing (or failing) to
// load.
vi.mock("@clerk/clerk-react", () => ({
  SignedIn: () => null,
  SignedOut: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderLanding() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  it("always shows Sign in, Get started, and View demo entry points", () => {
    renderLanding();

    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /get started/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /view demo/i }).length).toBeGreaterThan(0);
  });

  it("links Get started to /sign-up and View demo to /demo", () => {
    renderLanding();

    const getStarted = screen.getAllByRole("link", { name: /get started/i })[0];
    expect(getStarted).toHaveAttribute("href", "/sign-up");

    const viewDemo = screen.getAllByRole("link", { name: /view demo/i })[0];
    expect(viewDemo).toHaveAttribute("href", "/demo");
  });

  it("links each feature card into the matching demo tab", () => {
    renderLanding();

    expect(screen.getByRole("link", { name: /upload anything/i })).toHaveAttribute(
      "href",
      "/demo?tab=Documents",
    );
    expect(screen.getByRole("link", { name: /chat with your documents/i })).toHaveAttribute(
      "href",
      "/demo?tab=Chat",
    );
    expect(screen.getByRole("link", { name: /flashcards & quizzes/i })).toHaveAttribute(
      "href",
      "/demo?tab=Flashcards",
    );
  });
});
