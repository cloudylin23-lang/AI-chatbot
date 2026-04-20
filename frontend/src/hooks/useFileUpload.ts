import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UploadedFile } from '../types';
import { api } from '../services/api';

const ACCEPTED = ['application/pdf', 'text/plain', 'text/csv'];
const MAX_MB = 10;

export function useFileUpload(onSuccess: (file: UploadedFile, fileId: string) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validate = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) return 'Only PDF, TXT, CSV supported.';
    if (file.size > MAX_MB * 1024 * 1024) return `Max size is ${MAX_MB}MB.`;
    return null;
  };

  const upload = useCallback(async (file: File) => {
    const err = validate(file);
    if (err) { setUploadError(err); return; }
    setUploadError(null);
    setIsUploading(true);
    try {
      const res = await api.uploadFile(file);
      const uploaded: UploadedFile = {
        id: uuidv4(),
        name: res.filename,
        size: res.size,
        type: file.type,
        uploadedAt: new Date(),
      };
      onSuccess(uploaded, res.file_id);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }, [onSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  return { isUploading, uploadError, isDragging, upload, handleDrop, handleDragOver, handleDragLeave };
}