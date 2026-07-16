import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

import "./index.css";

// AuthProvider mounts Clerk only when VITE_CLERK_PUBLISHABLE_KEY is a real,
// configured key - otherwise it renders the app directly so the app never
// hard-crashes (a missing key) or hangs (a key pointing at a nonexistent
// Clerk instance) instead of degrading gracefully to signed-out/demo mode.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
