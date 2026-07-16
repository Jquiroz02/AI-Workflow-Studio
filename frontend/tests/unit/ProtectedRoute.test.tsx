import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: useAuthMock,
}));

function renderProtected() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/sign-in" element={<div>Sign in page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a spinner while Clerk is still loading", () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: false });
    renderProtected();

    expect(screen.getByText(/loading your workspace/i)).toBeInTheDocument();
  });

  it("redirects to sign-in when not signed in", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });
    renderProtected();

    expect(screen.getByText("Sign in page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("renders the protected content when signed in", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    renderProtected();

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});
