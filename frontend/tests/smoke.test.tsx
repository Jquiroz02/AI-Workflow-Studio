import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "@/App";
import { ThemeProvider } from "@/context/ThemeContext";
import { queryClient } from "@/lib/queryClient";

describe("App smoke test", () => {
  it("renders the landing page without crashing", () => {
    render(
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <MemoryRouter initialEntries={["/"]}>
              <App />
            </MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkProvider>,
    );

    expect(screen.getByText("AI Workflow Studio")).toBeInTheDocument();
    expect(screen.getByText(/knowledge base you can talk to/i)).toBeInTheDocument();
  });
});
