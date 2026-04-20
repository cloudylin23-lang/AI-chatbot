import { useState } from 'react';
import type { Message } from '../types';

interface Props {
  message: Message;
  onFeedback: (messageId: string, rating: 1 | -1) => void;
}

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function ThumbUp({ active }: { active?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  );
}
function ThumbDown({ active }: { active?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

// Simple markdown-like renderer: code blocks, inline code, bold, bullets
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');
      elements.push(<CodeBlock key={i} code={code} lang={lang} />);
      i++;
      continue;
    }

    // Bullet
    if (line.match(/^[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} style={{ margin: '6px 0 6px 16px', padding: 0, listStyle: 'disc' }}>
          {items.map((it, j) => <li key={j} style={{ marginBottom: 3 }}>{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Normal line
    elements.push(<p key={i} style={{ margin: 0, lineHeight: 1.65 }}>{renderInline(line)}</p>);
    i++;
  }
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="inline-code">{p.slice(1, -1)}</code>;
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    return p;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div style={{
      margin: '10px 0', borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(99,102,241,0.18)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px', background: 'rgba(15,23,42,0.85)',
      }}>
        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
          {lang || 'code'}
        </span>
        <button onClick={copy} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: copied ? '#22C55E' : '#94A3B8', fontFamily: 'inherit',
        }}>
          <CopyIcon /> {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '14px 16px', overflowX: 'auto',
        background: 'rgba(10,15,30,0.92)', color: '#E2E8F0',
        fontSize: 13, lineHeight: 1.6,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message, onFeedback }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`bubble-row ${isUser ? 'is-user' : ''}`}>
      <div className={`bubble-avatar ${isUser ? 'user' : 'ai'}`}>
        {isUser ? 'You' : 'AI'}
      </div>

      <div className="bubble-content">
        <div className={`bubble-box ${isUser ? 'user' : 'ai'}`}>
          {message.isStreaming && !message.content ? (
            <span style={{ opacity: 0.5 }}>●●●</span>
          ) : (
            renderMarkdown(message.content)
          )}
          {message.isStreaming && message.content && (
            <span style={{
              display: 'inline-block', width: 8, height: 14,
              background: '#6366F1', marginLeft: 2,
              animation: 'cursorBlink 0.8s step-end infinite',
              verticalAlign: 'middle', borderRadius: 2,
            }} />
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div style={{
            marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5,
          }}>
            {message.citations.map((c, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 100,
                background: 'rgba(99,102,241,0.08)', color: '#6366F1',
                border: '1px solid rgba(99,102,241,0.2)', fontWeight: 500,
              }}>
                📄 {c.source}, p.{c.page}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span className="bubble-time">{fmt(message.timestamp)}</span>

          {/* Feedback buttons — AI only */}
          {!isUser && !message.isStreaming && (
            <>
              <button
                onClick={() => onFeedback(message.id, 1)}
                title="Helpful"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                  color: message.feedback === 1 ? '#22C55E' : '#94A3B8',
                  transition: 'color 0.15s',
                }}
              >
                <ThumbUp active={message.feedback === 1} />
              </button>
              <button
                onClick={() => onFeedback(message.id, -1)}
                title="Not helpful"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                  color: message.feedback === -1 ? '#EF4444' : '#94A3B8',
                  transition: 'color 0.15s',
                }}
              >
                <ThumbDown active={message.feedback === -1} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}