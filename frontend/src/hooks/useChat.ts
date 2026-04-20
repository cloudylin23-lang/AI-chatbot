import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, UploadedFile, Citation } from '../types';
import { api } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setError(null);

    const userMsg: Message = {
      id: uuidv4(), role: 'user', content, timestamp: new Date(),
    };
    const aiMsgId = uuidv4();
    const aiMsg: Message = {
      id: aiMsgId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setIsLoading(true);

    abortRef.current = new AbortController();
    let finalContent = '';
    let finalCitations: Citation[] = [];

    try {
      const stream = api.streamChatFetch(
        { message: content, session_id: sessionId, file_ids: uploadedFiles.map(f => f.id) },
        abortRef.current.signal
      );

      for await (const chunk of stream) {
        if (chunk.done) break;
        if (chunk.token) {
          finalContent += chunk.token;
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: finalContent } : m)
          );
        }
        if (chunk.citations) {
          finalCitations = chunk.citations as Citation[];
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Something went wrong.');
      }
    } finally {
      setMessages(prev =>
        prev.map(m => m.id === aiMsgId
          ? { ...m, isStreaming: false, citations: finalCitations }
          : m
        )
      );
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [sessionId, uploadedFiles]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendFeedback = useCallback(async (messageId: string, rating: 1 | -1) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
    await api.sendFeedback(messageId, sessionId, rating).catch(() => {});
  }, [sessionId]);

  const addFile = useCallback((file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]); setUploadedFiles([]); setError(null);
  }, []);

  return {
    messages, isLoading, error, sessionId,
    uploadedFiles, addFile, removeFile,
    sendMessage, stopGeneration, sendFeedback, clearChat,
  };
}