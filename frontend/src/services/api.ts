import type { UploadResponse, QuizQuestion, Flashcard, SessionInfo, Message } from '../types';

const BASE = import.meta.env.VITE_API_URL || '';

export const api = {
  // ── Upload ──
  async uploadFile(file: File, sessionId?: string): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file);
    const url = sessionId ? `${BASE}/upload?session_id=${sessionId}` : `${BASE}/upload`;
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Upload failed');
    return res.json();
  },

  async uploadMultiple(files: File[], sessionId?: string): Promise<UploadResponse[]> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    const url = sessionId
      ? `${BASE}/upload/multiple?session_id=${sessionId}`
      : `${BASE}/upload/multiple`;
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Upload failed');
    return res.json();
  },

  // ── Streaming chat ──
  streamChat(payload: { message: string; session_id: string; file_ids: string[] }): EventSource {
    // We POST via fetch + ReadableStream (EventSource doesn't support POST)
    // Return a controller so caller can abort
    return null as unknown as EventSource; // handled in hook below
  },

  async *streamChatFetch(
    payload: { message: string; session_id: string; file_ids: string[] },
    signal: AbortSignal
  ): AsyncGenerator<{ token?: string; citations?: unknown[]; done?: boolean }> {
    const res = await fetch(`${BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { yield JSON.parse(line.slice(6)); } catch { /* skip */ }
        }
      }
    }
  },

  // ── Feedback ──
  async sendFeedback(messageId: string, sessionId: string, rating: 1 | -1): Promise<void> {
    await fetch(`${BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, session_id: sessionId, rating }),
    });
  },

  // ── Quiz & Flashcards ──
  async generateQuiz(fileId: string, numQuestions = 5): Promise<QuizQuestion[]> {
    const res = await fetch(`${BASE}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, num_questions: numQuestions }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Quiz generation failed');
    return res.json();
  },

  async generateFlashcards(fileId: string, numCards = 8): Promise<Flashcard[]> {
    const res = await fetch(`${BASE}/quiz/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, num_cards: numCards }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Flashcard generation failed');
    return res.json();
  },

  // ── History ──
  async getSessions(): Promise<SessionInfo[]> {
    const res = await fetch(`${BASE}/history/sessions`);
    return res.json();
  },

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const res = await fetch(`${BASE}/history/sessions/${sessionId}/messages`);
    const raw = await res.json();
    return raw.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.created_at as string),
    }));
  },

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${BASE}/history/sessions/${sessionId}`, { method: 'DELETE' });
  },
};