// Kept for backward compat — main upload logic is now in MessageInput.tsx
export function useFileUpload(_onSuccess: (file: unknown, fileId: string) => void) {
  return {
    isUploading: false,
    uploadError: null as string | null,
    isDragging: false,
    upload: async (_file: File) => {},
    handleDrop: (_e: React.DragEvent) => {},
    handleDragOver: (_e: React.DragEvent) => {},
    handleDragLeave: () => {},
  };
}