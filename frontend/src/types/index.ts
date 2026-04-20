export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  file_id?: string;
}

export interface ChatResponse {
  message: string;
  session_id: string;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  size: number;
  message: string;
}

export type Theme = 'light' | 'dark';