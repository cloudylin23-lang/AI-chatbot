import { useState, useRef, useEffect } from 'react';
import type { UploadedFile } from '../types';
import { api } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onSend: (msg: string) => void;
  isLoading: boolean;
  uploadedFiles: UploadedFile[];
  onUploadSuccess: (file: UploadedFile, fileId: string) => void;
  onRemoveFile: (fileId: string) => void;
  sessionId: string;
}

const ACCEPTED = ['application/pdf', 'text/plain', 'text/csv'];
const MAX_MB = 10;

const fmtBytes = (b: number) =>
  b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1048576).toFixed(1)}MB`;

export default function MessageInput({
  onSend, isLoading, uploadedFiles, onUploadSuccess, onRemoveFile, sessionId,
}: Props) {
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  const handleUpload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setUploadError('Only PDF, TXT, CSV supported.'); return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`Max ${MAX_MB}MB.`); return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const res = await api.uploadFile(file, sessionId);
      const uploaded: UploadedFile = {
        id: res.file_id,
        name: res.filename,
        size: res.size,
        type: file.type,
        uploadedAt: new Date(),
      };
      onUploadSuccess(uploaded, res.file_id);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = () => {
    const t = input.trim();
    if (!t || isLoading) return;
    onSend(t); setInput('');
  };

  const canSend = !!input.trim() && !isLoading;

  return (
    <div className="input-area">
      <div className="input-pill">
        {/* Attach button */}
        <>
          <input
            ref={fileRef} type="file" accept=".pdf,.txt,.csv" multiple
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              files.forEach(f => handleUpload(f));
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
          <button
            className="attach-btn"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            title="Attach PDF, TXT, CSV (multiple)"
          >
            {isUploading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'statusBlink 0.7s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            )}
          </button>
        </>

        {/* File chips inside pill */}
        {uploadedFiles.slice(0, 2).map(f => (
          <div key={f.id} className="file-chip-inline">
            <span>📎</span>
            <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}
            </span>
            <button className="file-chip-remove" onClick={() => onRemoveFile(f.id)}>✕</button>
          </div>
        ))}
        {uploadedFiles.length > 2 && (
          <span className="file-chip-inline">+{uploadedFiles.length - 2}</span>
        )}

        {/* Textarea */}
        <textarea
          ref={taRef} rows={1} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={isLoading}
          placeholder="Type a message…"
        />

        {/* Send */}
        <button className="send-btn" onClick={handleSend} disabled={!canSend} aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {uploadError && <p className="upload-error">⚠ {uploadError}</p>}
      <p className="input-hint">Enter · Shift+Enter newline · PDF TXT CSV ≤10MB · multiple files OK</p>
    </div>
  );
}