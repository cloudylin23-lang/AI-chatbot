export type MessageRole = 'user' | 'assistant';

export interface Citation { source: string; page: number; }

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  citations?: Citation[];
  feedback?: 1 | -1;
  isStreaming?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  size: number;
  message: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
  category: string;
}

export interface SessionInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatPayload {
  message: string;
  session_id: string;
  file_ids: string[];
}

export type Theme = 'light' | 'dark';
export type AppView = 'chat' | 'quiz';