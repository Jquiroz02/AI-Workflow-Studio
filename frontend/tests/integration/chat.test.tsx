import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ProjectPage } from "@/pages/ProjectPage";

import { API_BASE } from "../mocks/handlers";
import { server } from "../mocks/server";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "test-token", isLoaded: true, isSignedIn: true }),
}));

const projectId = "33333333-3333-3333-3333-333333333333";
const documentId = "44444444-4444-4444-4444-444444444444";
const conversationId = "55555555-5555-5555-5555-555555555555";

function renderProjectPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/dashboard/projects/${projectId}`]}>
        <Routes>
          <Route path="/dashboard/projects/:projectId" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Project chat flow", () => {
  it("sends a message and displays the assistant's reply with citations", async () => {
    server.use(
      http.get(`${API_BASE}/projects/${projectId}`, () =>
        HttpResponse.json({
          id: projectId,
          name: "Chat Test Project",
          description: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
      http.get(`${API_BASE}/projects/${projectId}/documents`, () =>
        HttpResponse.json([
          {
            id: documentId,
            project_id: projectId,
            original_filename: "biology.pdf",
            content_type: "application/pdf",
            file_size_bytes: 1000,
            status: "ready",
            processing_error: null,
            summary: null,
            summary_generated_at: null,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get(`${API_BASE}/projects/${projectId}/conversations`, () => HttpResponse.json([])),
      http.post(`${API_BASE}/projects/${projectId}/chat`, () =>
        HttpResponse.json({
          conversation_id: conversationId,
          message: {
            id: "msg-assistant-1",
            role: "assistant",
            content: "Mitochondria produce ATP through cellular respiration.",
            citations: [
              {
                document_id: documentId,
                document_filename: "biology.pdf",
                chunk_id: "chunk-1",
                snippet: "Mitochondria are the powerhouse of the cell.",
              },
            ],
            created_at: "2026-01-01T00:01:00Z",
          },
        }),
      ),
      http.get(`${API_BASE}/projects/${projectId}/conversations/${conversationId}`, () =>
        HttpResponse.json({
          id: conversationId,
          project_id: projectId,
          document_id: null,
          title: "What does the mitochondria do?",
          created_at: "2026-01-01T00:00:30Z",
          updated_at: "2026-01-01T00:01:00Z",
          messages: [
            {
              id: "msg-user-1",
              role: "user",
              content: "What does the mitochondria do?",
              citations: null,
              created_at: "2026-01-01T00:00:30Z",
            },
            {
              id: "msg-assistant-1",
              role: "assistant",
              content: "Mitochondria produce ATP through cellular respiration.",
              citations: [
                {
                  document_id: documentId,
                  document_filename: "biology.pdf",
                  chunk_id: "chunk-1",
                  snippet: "Mitochondria are the powerhouse of the cell.",
                },
              ],
              created_at: "2026-01-01T00:01:00Z",
            },
          ],
        }),
      ),
    );

    const user = userEvent.setup();
    renderProjectPage();

    await screen.findByText("Chat Test Project");
    await user.click(screen.getByRole("button", { name: "Chat" }));

    const textbox = await screen.findByPlaceholderText(/ask a question/i);
    await user.type(textbox, "What does the mitochondria do?{Enter}");

    await waitFor(() =>
      expect(
        screen.getByText("Mitochondria produce ATP through cellular respiration."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/\[1\] biology\.pdf/)).toBeInTheDocument();
  });

  it('"New chat" clears a half-typed draft and returns to the empty state', async () => {
    server.use(
      http.get(`${API_BASE}/projects/${projectId}`, () =>
        HttpResponse.json({
          id: projectId,
          name: "Chat Test Project",
          description: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
      http.get(`${API_BASE}/projects/${projectId}/documents`, () =>
        HttpResponse.json([
          {
            id: documentId,
            project_id: projectId,
            original_filename: "biology.pdf",
            content_type: "application/pdf",
            file_size_bytes: 1000,
            status: "ready",
            processing_error: null,
            summary: null,
            summary_generated_at: null,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get(`${API_BASE}/projects/${projectId}/conversations`, () =>
        HttpResponse.json([
          {
            id: conversationId,
            project_id: projectId,
            document_id: null,
            title: "What does the mitochondria do?",
            created_at: "2026-01-01T00:00:30Z",
            updated_at: "2026-01-01T00:01:00Z",
          },
        ]),
      ),
      http.get(`${API_BASE}/projects/${projectId}/conversations/${conversationId}`, () =>
        HttpResponse.json({
          id: conversationId,
          project_id: projectId,
          document_id: null,
          title: "What does the mitochondria do?",
          created_at: "2026-01-01T00:00:30Z",
          updated_at: "2026-01-01T00:01:00Z",
          messages: [
            {
              id: "msg-user-1",
              role: "user",
              content: "What does the mitochondria do?",
              citations: null,
              created_at: "2026-01-01T00:00:30Z",
            },
          ],
        }),
      ),
    );

    const user = userEvent.setup();
    renderProjectPage();

    await screen.findByText("Chat Test Project");
    await user.click(screen.getByRole("button", { name: "Chat" }));

    // Open the existing conversation, then start (but don't send) a new draft.
    await user.click(await screen.findByText("What does the mitochondria do?"));
    const textbox = await screen.findByPlaceholderText(/ask a question/i);
    await user.type(textbox, "an unsent draft that should not survive New chat");
    expect(textbox).toHaveValue("an unsent draft that should not survive New chat");

    await user.click(screen.getAllByRole("button", { name: /new chat/i })[0]);

    expect(textbox).toHaveValue("");
    expect(
      screen.getByText(/ask a question about your documents to start a new chat/i),
    ).toBeInTheDocument();
  });

  it("defaults to document-only mode and sends the selected mode to the backend", async () => {
    const receivedBodies: Array<{ answer_mode?: string }> = [];

    server.use(
      http.get(`${API_BASE}/projects/${projectId}`, () =>
        HttpResponse.json({
          id: projectId,
          name: "Chat Test Project",
          description: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
      http.get(`${API_BASE}/projects/${projectId}/documents`, () =>
        HttpResponse.json([
          {
            id: documentId,
            project_id: projectId,
            original_filename: "biology.pdf",
            content_type: "application/pdf",
            file_size_bytes: 1000,
            status: "ready",
            processing_error: null,
            summary: null,
            summary_generated_at: null,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get(`${API_BASE}/projects/${projectId}/conversations`, () => HttpResponse.json([])),
      http.post(`${API_BASE}/projects/${projectId}/chat`, async ({ request }) => {
        const body = (await request.json()) as { answer_mode?: string };
        receivedBodies.push(body);
        return HttpResponse.json({
          conversation_id: conversationId,
          message: {
            id: `msg-assistant-${receivedBodies.length}`,
            role: "assistant",
            content: "An answer.",
            citations: null,
            created_at: "2026-01-01T00:01:00Z",
          },
        });
      }),
      http.get(`${API_BASE}/projects/${projectId}/conversations/${conversationId}`, () =>
        HttpResponse.json({
          id: conversationId,
          project_id: projectId,
          document_id: null,
          title: "q",
          created_at: "2026-01-01T00:00:30Z",
          updated_at: "2026-01-01T00:01:00Z",
          messages: [],
        }),
      ),
    );

    const user = userEvent.setup();
    renderProjectPage();

    await screen.findByText("Chat Test Project");
    await user.click(screen.getByRole("button", { name: "Chat" }));

    const textbox = await screen.findByPlaceholderText(/ask a question/i);
    await user.type(textbox, "first question{Enter}");
    await waitFor(() => expect(receivedBodies).toHaveLength(1));
    expect(receivedBodies[0].answer_mode).toBe("document_only");

    await user.selectOptions(screen.getByLabelText(/answer mode/i), "ai_knowledge");
    await user.type(textbox, "second question{Enter}");
    await waitFor(() => expect(receivedBodies).toHaveLength(2));
    expect(receivedBodies[1].answer_mode).toBe("ai_knowledge");
  });
});
