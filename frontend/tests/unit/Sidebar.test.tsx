import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/context/ThemeContext";

vi.mock("@clerk/clerk-react", () => ({
  UserButton: () => null,
}));

function renderSidebar(initialEntry = "/dashboard/projects/some-project") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider>
        <Routes>
          <Route path="/dashboard/*" element={<Sidebar />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("Sidebar brand link", () => {
  it("renders the brand as a link to the dashboard", () => {
    renderSidebar();

    const brandLink = screen.getByRole("link", { name: /ai workflow studio/i });
    expect(brandLink).toHaveAttribute("href", "/dashboard");
  });

  it("calls onNavigate when the brand link is clicked, like other nav items", async () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter initialEntries={["/dashboard/projects/some-project"]}>
        <ThemeProvider>
          <Routes>
            <Route path="/dashboard/*" element={<Sidebar onNavigate={onNavigate} />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const brandLink = screen.getByRole("link", { name: /ai workflow studio/i });
    brandLink.click();

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
