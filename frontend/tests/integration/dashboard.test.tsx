import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/pages/DashboardPage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "test-token", isLoaded: true, isSignedIn: true }),
}));

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/projects/:projectId" element={<div>Project detail page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  it("lists projects returned by the API", async () => {
    renderDashboard();

    expect(await screen.findByText("Existing Project")).toBeInTheDocument();
    expect(screen.getByText("An already-created project")).toBeInTheDocument();
  });

  it("creates a project and navigates to its detail page", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Existing Project");

    await user.click(screen.getByRole("button", { name: /new project/i }));
    await user.type(screen.getByLabelText(/^name$/i), "My New Project");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(screen.getByText("Project detail page")).toBeInTheDocument());
  });
});
