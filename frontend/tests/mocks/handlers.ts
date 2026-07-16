import { http, HttpResponse } from "msw";

export const API_BASE = "http://localhost:8000/api/v1";

export const existingProject = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Existing Project",
  description: "An already-created project",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  document_count: 2,
  conversation_count: 1,
};

export const newProjectId = "22222222-2222-2222-2222-222222222222";

export const handlers = [
  http.get(`${API_BASE}/projects`, () => HttpResponse.json([existingProject])),

  http.post(`${API_BASE}/projects`, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    return HttpResponse.json(
      {
        id: newProjectId,
        name: body.name,
        description: body.description ?? null,
        created_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      { status: 201 },
    );
  }),

  http.get(`${API_BASE}/projects/:projectId`, ({ params }) =>
    HttpResponse.json({ ...existingProject, id: params.projectId }),
  ),

  http.get(`${API_BASE}/projects/:projectId/documents`, () => HttpResponse.json([])),
  http.get(`${API_BASE}/projects/:projectId/conversations`, () => HttpResponse.json([])),
];
