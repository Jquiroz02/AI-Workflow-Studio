export type DocumentStatus = "pending" | "processing" | "ready" | "failed";
export type MessageRole = "user" | "assistant";
export type AnswerMode = "document_only" | "ai_knowledge";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary extends Project {
  document_count: number;
  conversation_count: number;
}

export interface Document {
  id: string;
  project_id: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  processing_error: string | null;
  summary: string | null;
  summary_generated_at: string | null;
  created_at: string;
}

export interface DocumentSearchResult {
  document_id: string;
  document_filename: string;
  chunk_id: string;
  snippet: string;
  similarity: number;
}

export interface Citation {
  document_id: string;
  document_filename: string;
  chunk_id: string;
  snippet: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  document_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ChatResponse {
  conversation_id: string;
  message: Message;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

export interface FlashcardSet {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  cards: Flashcard[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  order_index: number;
}

export interface Quiz {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  questions: QuizQuestion[];
}
