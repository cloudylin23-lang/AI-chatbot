import { useState, useEffect, useCallback } from 'react';
import { useChat } from './hooks/useChat';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import QuizPage from './components/QuizPage';
import type { Theme, AppView, UploadedFile } from './types';
import './quiz.css';

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const QuizIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
  </svg>
);

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const s = localStorage.getItem('theme') as Theme | null;
    return s ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [view, setView] = useState<AppView>('chat');

  const {
    messages, isLoading, error, sessionId,
    uploadedFiles, addFile, removeFile,
    sendMessage, stopGeneration, sendFeedback, clearChat,
  } = useChat();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleUploadSuccess = useCallback((file: UploadedFile, fileId: string) => {
    addFile({ ...file, id: fileId });
  }, [addFile]);

  return (
    <div className={`app-root ${theme}`}>
      <div className="blob blob-top" />
      <div className="blob blob-bottom" />
      <div className="grid-overlay" />

      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="logo-row">
            <div className="logo-mark" />
            <span className="logo-text">Lumi</span>
          </div>

          <nav className="sidebar-nav">
            <button className={`nav-item ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>
              <ChatIcon /> Chat
            </button>
            <button className={`nav-item ${view === 'quiz' ? 'active' : ''}`} onClick={() => setView('quiz')}>
              <QuizIcon /> Kiểm tra
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="nav-item danger" onClick={clearChat}><TrashIcon /> Clear</button>
            <button className="nav-item" onClick={toggleTheme}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main-panel">
          {view === 'quiz' ? (
            <QuizPage uploadedFiles={uploadedFiles} onBackToChat={() => setView('chat')} />
          ) : (
            <>
              {/* Topbar */}
              <header className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="topbar-title">New conversation</span>
                  {uploadedFiles.map(f => (
                    <span key={f.id} className="file-badge">
                      📎 {f.name}
                      <button
                        onClick={() => removeFile(f.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, color: '#94A3B8', fontSize: 10, padding: 0, lineHeight: 1 }}
                      >✕</button>
                    </span>
                  ))}
                </div>

                <div className="system-status">
                  <span className="status-dot" />
                  System Active
                  <span className="status-sep">|</span>
                  Model: Llama 3.2
                  <span className="status-sep">|</span>
                  Latency: 160ms
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isLoading && (
                    <button
                      onClick={stopGeneration}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 8,
                        border: '1px solid #FCA5A5',
                        background: '#FEF2F2', cursor: 'pointer',
                        fontSize: 12, color: '#EF4444', fontWeight: 600,
                      }}
                    >
                      <StopIcon /> Stop
                    </button>
                  )}
                  <button className="theme-btn-mobile" onClick={toggleTheme}>
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                  </button>
                </div>
              </header>

              {isLoading && <div className="glow-line" />}

              <div className="glass-container">
                <ChatWindow
                  messages={messages}
                  isLoading={isLoading}
                  error={error}
                  onFeedback={sendFeedback}
                />
              </div>

              <MessageInput
                onSend={sendMessage}
                isLoading={isLoading}
                uploadedFiles={uploadedFiles}
                onUploadSuccess={handleUploadSuccess}
                onRemoveFile={removeFile}
                sessionId={sessionId}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}