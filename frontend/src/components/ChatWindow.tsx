import { useEffect, useRef, useState } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';

interface Props {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onFeedback: (messageId: string, rating: 1 | -1) => void;
}

const SUGGESTIONS = [
  'Summarize the uploaded document',
  'What are the key points?',
  'Explain this in simple terms',
  'List the main topics covered',
];

function Bot3D() {
  return (
    <div className="bot-wrapper">
      <div className="bot-antenna" />
      <div className="bot-body">
        <div className="bot-eyes">
          <div className="bot-eye" />
          <div className="bot-eye" />
        </div>
        <div className="bot-mouth" />
      </div>
      <div className="bot-shadow" />
    </div>
  );
}

function Typewriter() {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const full = 'Hello, have a nice day!';
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++; setText(full.slice(0, i));
      if (i >= full.length) { clearInterval(t); setDone(true); }
    }, 65);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="typewriter" style={{ borderRight: done ? 'none' : undefined }}>
      {text}
    </div>
  );
}

export default function ChatWindow({ messages, isLoading, error, onFeedback }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-scroll">
      {messages.length === 0 && !isLoading ? (
        <div className="empty-state">
          <Bot3D />
          <Typewriter />
          <p className="empty-sub">Send a message or upload a file to get started.</p>
          <div className="suggestion-grid">
            {SUGGESTIONS.map(s => (
              <div key={s} className="suggestion-chip">{s}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages-list">
          {messages.map(m => (
            <MessageBubble key={m.id} message={m} onFeedback={onFeedback} />
          ))}
          {isLoading && <LoadingIndicator />}
          {error && (
            <div className="error-banner">
              <span>⚠</span><span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}