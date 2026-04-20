import { useState, useEffect } from 'react';
import type { UploadedFile, QuizQuestion, Flashcard } from '../types';
import { useQuiz } from '../hooks/useQuiz';

interface Props {
  uploadedFiles: UploadedFile[];
  onBackToChat: () => void;
}

type Tab = 'quiz' | 'flashcard';

/* ── Icons ── */
const ArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const Download = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);
const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

/* ── Doc Preview Panel ── */
function DocPreview({ file }: { file: UploadedFile | undefined }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!file) { setContent(''); return; }
    setLoading(true);
    fetch(`/upload/${file.id}/preview?max_chars=3000`)
      .then(r => r.json())
      .then(data => {
        setContent(data.content || '');
        setTruncated(data.truncated || false);
      })
      .catch(() => setContent(''))
      .finally(() => setLoading(false));
  }, [file?.id]);

  if (!file) {
    return (
      <div className="quiz-doc-inner">
        <FileIcon />
        <span className="quiz-doc-label">Chưa có tài liệu</span>
        <span style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', maxWidth: 160 }}>
          Upload file PDF, TXT hoặc CSV trong phần Chat
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quiz-doc-inner">
        <div className="quiz-spinner" style={{ borderTopColor: '#6366F1', borderColor: '#E2E8F0' }} />
        <span className="quiz-doc-label">Đang tải...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* File header */}
      <div style={{
        padding: '12px 16px 10px',
        borderBottom: '1px solid #E2E8F0',
        flexShrink: 0,
        background: 'white',
      }} className="dark-doc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>
            {file.type === 'application/pdf' ? '📄' : file.type.includes('csv') ? '📊' : '📝'}
          </span>
          <div>
            <p style={{
              fontSize: 12, fontWeight: 600, color: '#0F172A',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 180,
            }}>{file.name}</p>
            <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>
              {(file.size / 1024).toFixed(0)} KB • Xem trước nội dung
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 16px',
        fontSize: 12, lineHeight: 1.7, color: '#475569',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {content || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Không có nội dung để xem trước</span>}

        {truncated && (
          <div style={{
            marginTop: 16, padding: '8px 12px', borderRadius: 8,
            background: '#EEF2FF', border: '1px solid #C7D2FE',
            fontSize: 11, color: '#6366F1', textAlign: 'center',
          }}>
            ··· Hiển thị 3000 ký tự đầu tiên ···
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Quiz view ── */
function QuizView({ questions, file, onGenerate, isGenerating }:
  { questions: QuizQuestion[]; file: UploadedFile | undefined; onGenerate: (n: number) => void; isGenerating: boolean }) {

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [numQ, setNumQ] = useState(5);
  const score = questions.filter((q, i) => answers[i] === q.answer).length;

  return (
    <div className="quiz-content-area">
      <div className="quiz-doc-panel">
        <DocPreview file={file} />
      </div>

      <div className="quiz-questions-panel">
        {questions.length === 0 ? (
          <div className="quiz-empty">
            <div className="quiz-gen-controls">
              <label className="quiz-gen-label">Số câu hỏi</label>
              <div className="quiz-num-select">
                {[3, 5, 8, 10].map(n => (
                  <button key={n} onClick={() => setNumQ(n)}
                    className={`quiz-num-btn ${numQ === n ? 'active' : ''}`}>{n}</button>
                ))}
              </div>
              <button className="quiz-generate-btn" onClick={() => onGenerate(numQ)}
                disabled={!file || isGenerating}>
                {isGenerating
                  ? <><div className="quiz-spinner" />Đang tạo...</>
                  : <><SparkleIcon />Tạo câu hỏi từ tài liệu</>
                }
              </button>
              {!file && <p className="quiz-no-file">⚠ Vui lòng upload file trong Chat trước</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="quiz-score-bar">
              <span className="quiz-score-label">Điểm: <strong>{score}/{questions.length}</strong></span>
              <button className="quiz-reset-btn" onClick={() => { setAnswers({}); setRevealed({}); }}>
                Làm lại
              </button>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="quiz-card">
                <div className="quiz-q-header">
                  <span className="quiz-q-num">Câu {i + 1}</span>
                  {revealed[i] && (
                    <span className={`quiz-badge ${answers[i] === q.answer ? 'correct' : 'wrong'}`}>
                      {answers[i] === q.answer ? '✓ Đúng' : '✗ Sai'}
                    </span>
                  )}
                </div>
                <p className="quiz-q-text">{q.question}</p>
                <div className="quiz-options">
                  {q.options.map((opt, j) => {
                    const letter = opt[0];
                    const isSelected = answers[i] === letter;
                    const isCorrect = q.answer === letter;
                    let cls = 'quiz-opt';
                    if (revealed[i]) {
                      if (isCorrect) cls += ' opt-correct';
                      else if (isSelected) cls += ' opt-wrong';
                    } else if (isSelected) cls += ' opt-selected';
                    return (
                      <button key={j} className={cls}
                        onClick={() => !revealed[i] && setAnswers(p => ({ ...p, [i]: letter }))}>
                        <span className="opt-letter">{letter}</span>
                        <span>{opt.slice(2).trim()}</span>
                      </button>
                    );
                  })}
                </div>
                {answers[i] && !revealed[i] && (
                  <button className="quiz-reveal-btn"
                    onClick={() => setRevealed(p => ({ ...p, [i]: true }))}>
                    Kiểm tra đáp án
                  </button>
                )}
                {revealed[i] && q.explanation && (
                  <div className="quiz-explanation">
                    <strong>Giải thích:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Flashcard view ── */
function FlashcardView({ cards, file, onGenerate, isGenerating }:
  { cards: Flashcard[]; file: UploadedFile | undefined; onGenerate: (n: number) => void; isGenerating: boolean }) {

  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [numCards, setNumCards] = useState(8);

  const catColors: Record<string, string> = {
    'Definition': 'cat-blue', 'Formula': 'cat-purple',
    'Concept': 'cat-indigo', 'Term': 'cat-green',
  };
  const getCat = (cat: string) => catColors[cat] || 'cat-indigo';

  return (
    <div className="quiz-content-area">
      <div className="quiz-doc-panel">
        <DocPreview file={file} />
      </div>

      <div className="quiz-questions-panel">
        {cards.length === 0 ? (
          <div className="quiz-empty">
            <div className="quiz-gen-controls">
              <label className="quiz-gen-label">Số flashcard</label>
              <div className="quiz-num-select">
                {[4, 8, 12, 16].map(n => (
                  <button key={n} onClick={() => setNumCards(n)}
                    className={`quiz-num-btn ${numCards === n ? 'active' : ''}`}>{n}</button>
                ))}
              </div>
              <button className="quiz-generate-btn" onClick={() => onGenerate(numCards)}
                disabled={!file || isGenerating}>
                {isGenerating
                  ? <><div className="quiz-spinner" />Đang tạo...</>
                  : <><SparkleIcon />Tạo flashcard từ tài liệu</>
                }
              </button>
              {!file && <p className="quiz-no-file">⚠ Vui lòng upload file trong Chat trước</p>}
            </div>
          </div>
        ) : (
          <div className="flashcard-grid">
            {cards.map((c, i) => (
              <div key={i} className={`flashcard ${flipped[i] ? 'flipped' : ''}`}
                onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}>
                <div className="flashcard-inner">
                  <div className="flashcard-front">
                    <span className={`flashcard-cat ${getCat(c.category)}`}>{c.category}</span>
                    <p className="flashcard-term">{c.front}</p>
                    <span className="flashcard-hint">Nhấn để xem định nghĩa</span>
                  </div>
                  <div className="flashcard-back">
                    <p className="flashcard-def">{c.back}</p>
                    <span className="flashcard-hint">Nhấn để lật lại</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main QuizPage ── */
export default function QuizPage({ uploadedFiles, onBackToChat }: Props) {
  const [tab, setTab] = useState<Tab>('quiz');
  const { questions, flashcards, isGenerating, error, generateQuiz, generateFlashcards } = useQuiz();

  const primaryFile = uploadedFiles[0];
  const fileId = primaryFile?.id ?? '';

  const handleExport = () => {
    const data = tab === 'quiz' ? JSON.stringify(questions, null, 2) : JSON.stringify(flashcards, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lumi-${tab}-export.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="quiz-page">
      {/* Header */}
      <header className="quiz-header">
        <div className="quiz-header-left">
          <span className="quiz-mode-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            CHẾ ĐỘ CHỈNH SỬA
          </span>
          <h1 className="quiz-header-title">Kiểm tra &amp; Chỉnh sửa</h1>
          {primaryFile && (
            <p className="quiz-header-sub">Được tạo từ '<em>{primaryFile.name}</em>'</p>
          )}
        </div>
        <div className="quiz-header-actions">
          <button className="quiz-header-btn ghost" onClick={onBackToChat}>
            <ArrowLeft /> Quay lại Chat
          </button>
          <button className="quiz-header-btn primary" onClick={handleExport}
            disabled={tab === 'quiz' ? questions.length === 0 : flashcards.length === 0}>
            <Download /> Xuất tệp
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="quiz-tabs">
        <button className={`quiz-tab ${tab === 'quiz' ? 'active' : ''}`} onClick={() => setTab('quiz')}>
          Bài kiểm tra (LMS)
          {questions.length > 0 && <span className="quiz-tab-badge">{questions.length}</span>}
        </button>
        <button className={`quiz-tab ${tab === 'flashcard' ? 'active' : ''}`} onClick={() => setTab('flashcard')}>
          Thẻ ghi nhớ
          {flashcards.length > 0 && <span className="quiz-tab-badge">{flashcards.length}</span>}
        </button>
      </div>

      {/* Toolbar */}
      <div className="quiz-toolbar">
        <div className="quiz-toolbar-left">
          <span className="quiz-tool-label">Hỗ trợ AI:</span>
          <button className="quiz-ai-btn"
            onClick={() => tab === 'quiz' ? generateQuiz(fileId) : generateFlashcards(fileId)}
            disabled={!fileId || isGenerating}>
            {isGenerating ? 'Đang tạo...' : tab === 'quiz' ? 'Tạo bộ câu hỏi' : 'Tạo flashcard'}
          </button>

          {/* File selector if multiple */}
          {uploadedFiles.length > 1 && (
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>
              Đang dùng: {primaryFile?.name}
            </span>
          )}
        </div>
      </div>

      {error && <div className="quiz-error">⚠ {error}</div>}

      {tab === 'quiz' ? (
        <QuizView questions={questions} file={primaryFile}
          onGenerate={n => generateQuiz(fileId, n)} isGenerating={isGenerating} />
      ) : (
        <FlashcardView cards={flashcards} file={primaryFile}
          onGenerate={n => generateFlashcards(fileId, n)} isGenerating={isGenerating} />
      )}
    </div>
  );
}