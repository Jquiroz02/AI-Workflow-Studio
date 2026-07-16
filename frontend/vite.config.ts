/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    watch: {
      // Native filesystem change events from a Docker bind-mount don't
      // reliably reach the container (colima/Docker Desktop on macOS in
      // particular), so Vite's default watcher can silently stop noticing
      // edits and keep serving stale, pre-change modules with no error and
      // no HMR log line - it just looks like the app "isn't picking up
      // fixes." Polling sidesteps that by not depending on OS-level events
      // at all. Only enabled inside the container (see docker-compose.yml's
      // DOCKER_CONTAINER=true) so native local dev keeps the cheaper
      // default watcher.
      usePolling: process.env.DOCKER_CONTAINER === "true",
      interval: 300,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    css: true,
    env: {
      VITE_API_BASE_URL: "http://localhost:8000/api/v1",
      // Deliberately different from the documented "unconfigured" sentinel
      // in .env.example (see src/lib/auth.tsx's PLACEHOLDER_CLERK_PUBLISHABLE_KEY) -
      // the test suite mocks @clerk/clerk-react directly and expects the app
      // to treat auth as configured, not fall back to the no-op adapter.
      VITE_CLERK_PUBLISHABLE_KEY:
        "pk_test_dGVzdC1maXh0dXJlLWNsZXJrLWluc3RhbmNlLmNsZXJrLmFjY291bnRzLmRldiQ",
    },
  },
});
