import { useState, useCallback } from 'react';
import type { QuizQuestion, Flashcard } from '../types';
import { api } from '../services/api';

export function useQuiz() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = useCallback(async (fileId: string, num = 5) => {
    setIsGenerating(true); setError(null);
    try {
      const q = await api.generateQuiz(fileId, num);
      setQuestions(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateFlashcards = useCallback(async (fileId: string, num = 8) => {
    setIsGenerating(true); setError(null);
    try {
      const c = await api.generateFlashcards(fileId, num);
      setFlashcards(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setQuestions([]); setFlashcards([]); setError(null);
  }, []);

  return { questions, flashcards, isGenerating, error, generateQuiz, generateFlashcards, reset };
}