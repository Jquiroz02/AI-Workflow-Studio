import type {
  Conversation,
  Document,
  DocumentSearchResult,
  FlashcardSet,
  Message,
  Project,
  Quiz,
} from "@/types/api";

// Static sample data for /demo - lets a visitor click through the whole
// product (documents, chat with citations, flashcards, a quiz, search)
// without a backend, a database, an OpenAI key, or a Clerk account. Nothing
// here is fetched or persisted; the demo page holds it in local state.

export const demoProject: Project = {
  id: "demo-project",
  name: "Cell Biology 101",
  description: "Lecture notes and readings for an intro cell biology course.",
  created_at: "2026-06-01T12:00:00Z",
  updated_at: "2026-07-01T12:00:00Z",
};

export const demoDocuments: Document[] = [
  {
    id: "demo-doc-1",
    project_id: demoProject.id,
    original_filename: "cell-structure-lecture-notes.pdf",
    content_type: "application/pdf",
    file_size_bytes: 482_000,
    status: "ready",
    processing_error: null,
    summary:
      "Covers the structure and function of eukaryotic cells: the plasma membrane, nucleus, " +
      "mitochondria, and endoplasmic reticulum. Explains how mitochondria generate ATP through " +
      "cellular respiration, and why they're described as the \"powerhouse of the cell.\" Closes " +
      "with a comparison of plant vs. animal cell organelles.",
    summary_generated_at: "2026-06-01T12:05:00Z",
    created_at: "2026-06-01T12:00:00Z",
  },
  {
    id: "demo-doc-2",
    project_id: demoProject.id,
    original_filename: "photosynthesis-overview.txt",
    content_type: "text/plain",
    file_size_bytes: 18_400,
    status: "ready",
    processing_error: null,
    summary: null,
    summary_generated_at: null,
    created_at: "2026-06-03T09:30:00Z",
  },
  {
    id: "demo-doc-3",
    project_id: demoProject.id,
    original_filename: "genetics-midterm-review.pdf",
    content_type: "application/pdf",
    file_size_bytes: 265_000,
    status: "processing",
    processing_error: null,
    summary: null,
    summary_generated_at: null,
    created_at: "2026-07-01T12:00:00Z",
  },
];

export const demoConversation: Conversation = {
  id: "demo-conversation",
  project_id: demoProject.id,
  document_id: null,
  title: "What is the mitochondria?",
  created_at: "2026-06-02T10:00:00Z",
  updated_at: "2026-06-02T10:00:05Z",
};

export const demoMessages: Message[] = [
  {
    id: "demo-msg-1",
    role: "user",
    content: "What does the mitochondria do?",
    citations: null,
    created_at: "2026-06-02T10:00:00Z",
  },
  {
    id: "demo-msg-2",
    role: "assistant",
    content:
      "The mitochondria is the powerhouse of the cell — it generates most of the cell's ATP " +
      "through cellular respiration [1]. It has its own double membrane, with the inner membrane " +
      "folded into cristae that increase surface area for energy production [1].",
    citations: [
      {
        document_id: demoDocuments[0].id,
        document_filename: demoDocuments[0].original_filename,
        chunk_id: "demo-chunk-1",
        snippet:
          "The mitochondria is the powerhouse of the cell, generating ATP through cellular " +
          "respiration. Its inner membrane is folded into cristae, increasing the surface area " +
          "available for energy production.",
      },
    ],
    created_at: "2026-06-02T10:00:04Z",
  },
];

// Canned follow-up answers keyed by a lowercase substring of the question,
// falling back to a generic grounded-sounding response - just enough to
// make the demo chat feel responsive to what you type without needing a
// real model behind it.
export const demoCannedReplies: { match: string; reply: string }[] = [
  {
    match: "photosynthesis",
    reply:
      "Photosynthesis converts light energy into chemical energy stored in glucose, using " +
      "carbon dioxide and water as inputs and releasing oxygen as a byproduct [1]. It happens " +
      "in the chloroplasts, primarily in the light-dependent reactions and the Calvin cycle.",
  },
  {
    match: "nucleus",
    reply:
      "The nucleus houses the cell's DNA and controls gene expression [1]. It's enclosed by a " +
      "double membrane (the nuclear envelope) with pores that regulate what molecules can pass " +
      "in and out.",
  },
];

export const demoFlashcardSet: FlashcardSet = {
  id: "demo-flashcard-set",
  document_id: demoDocuments[0].id,
  title: "Flashcards - cell-structure-lecture-notes.pdf",
  created_at: "2026-06-01T12:10:00Z",
  cards: [
    {
      id: "demo-card-1",
      order_index: 0,
      question: "What is the primary function of the mitochondria?",
      answer: "Generating ATP (energy) for the cell through cellular respiration.",
    },
    {
      id: "demo-card-2",
      order_index: 1,
      question: "What structure folds the mitochondria's inner membrane to increase surface area?",
      answer: "Cristae.",
    },
    {
      id: "demo-card-3",
      order_index: 2,
      question: "What is the main difference between plant and animal cells covered in the notes?",
      answer: "Plant cells have a cell wall, chloroplasts, and a large central vacuole; animal cells don't.",
    },
    {
      id: "demo-card-4",
      order_index: 3,
      question: "What does the endoplasmic reticulum do?",
      answer: "Synthesizes and transports proteins and lipids within the cell.",
    },
  ],
};

export const demoQuiz: Quiz = {
  id: "demo-quiz",
  document_id: demoDocuments[0].id,
  title: "Quiz - cell-structure-lecture-notes.pdf",
  created_at: "2026-06-01T12:15:00Z",
  questions: [
    {
      id: "demo-q-1",
      order_index: 0,
      question: "Which organelle is described as the \"powerhouse of the cell\"?",
      choices: ["Nucleus", "Mitochondria", "Golgi apparatus", "Ribosome"],
      correct_index: 1,
      explanation: "The mitochondria generates most of the cell's ATP through cellular respiration.",
    },
    {
      id: "demo-q-2",
      order_index: 1,
      question: "What are the folds of the mitochondria's inner membrane called?",
      choices: ["Cristae", "Villi", "Thylakoids", "Cisternae"],
      correct_index: 0,
      explanation: "Cristae increase the surface area available for ATP production.",
    },
    {
      id: "demo-q-3",
      order_index: 2,
      question: "Which of these is found in plant cells but not animal cells?",
      choices: ["Nucleus", "Mitochondria", "Cell wall", "Plasma membrane"],
      correct_index: 2,
      explanation: "Plant cells have a rigid cell wall outside the plasma membrane; animal cells don't.",
    },
  ],
};

export const demoSearchResults: DocumentSearchResult[] = [
  {
    document_id: demoDocuments[0].id,
    document_filename: demoDocuments[0].original_filename,
    chunk_id: "demo-chunk-1",
    snippet:
      "The mitochondria is the powerhouse of the cell, generating ATP through cellular " +
      "respiration. Its inner membrane is folded into cristae, increasing the surface area " +
      "available for energy production.",
    similarity: 0.91,
  },
  {
    document_id: demoDocuments[0].id,
    document_filename: demoDocuments[0].original_filename,
    chunk_id: "demo-chunk-2",
    snippet:
      "Unlike most organelles, mitochondria contain their own small circular DNA genome, " +
      "separate from the cell's nuclear DNA.",
    similarity: 0.78,
  },
  {
    document_id: demoDocuments[1].id,
    document_filename: demoDocuments[1].original_filename,
    chunk_id: "demo-chunk-3",
    snippet:
      "Chloroplasts and mitochondria are both thought to have originated as free-living " +
      "bacteria, later absorbed by early eukaryotic cells (the endosymbiotic theory).",
    similarity: 0.64,
  },
];
