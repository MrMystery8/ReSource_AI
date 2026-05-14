import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SESSION,
  ALLOWED_FILE_EXTENSIONS,
} from '@resource-ai/shared';
import { Upload, X, AlertCircle, Image, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { ApiClient } from '../services/api';

const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.html': 'text/html',
  '.csv': 'text/csv',
  '.json': 'application/json',
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const ALLOWED_MIME_TYPES = Object.values(EXTENSION_TO_MIME);
const ACCEPT_STRING = (ALLOWED_FILE_EXTENSIONS as readonly string[]).join(',');

export type FileStatus = 'uploading' | 'success' | 'error';

export interface UploadedFile {
  id: string;
  name: string;
  status: FileStatus;
  errorMessage?: string;
  /** Local preview URL for images */
  previewUrl?: string;
  /** The original File object for preview generation */
  file?: File;
}

export interface FileUploaderProps {
  apiUrl: string;
  apiKey: string;
  authToken?: string | null;
  sessionId?: string;
  onFilesUploaded: (fileIds: string[]) => void;
}

export function FileUploader({ apiUrl, apiKey, authToken, sessionId, onFilesUploaded }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(authToken ?? null);
  tokenRef.current = authToken ?? null;
  const apiClientRef = useRef<ApiClient>(new ApiClient(apiUrl, apiKey, () => tokenRef.current));

  const successfulFileIds = files.filter((f) => f.status === 'success').map((f) => f.id);
  const totalFiles = files.length;
  const canUploadMore = totalFiles < MAX_FILES_PER_SESSION;

  const isImageFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext || '');
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" exceeds the 10 MB size limit.`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
        return `File "${file.name}" has an unsupported format.`;
      }
    }
    return null;
  };

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      const updated = prev.filter((f) => f.id !== id);
      const newSuccessIds = updated.filter((f) => f.status === 'success').map((f) => f.id);
      onFilesUploaded(newSuccessIds);
      return updated;
    });
    setError(null);
  }, [onFilesUploaded]);

  const uploadFile = async (file: File, tempId: string): Promise<void> => {
    try {
      if (!tokenRef.current) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const base64Body = await readFileAsBase64(file);
      const data = await apiClientRef.current.uploadEvidenceFile(
        base64Body,
        file.type || 'application/octet-stream',
        file.name,
        sessionId
      );
      const fileId = data.fileId;

      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === tempId ? { ...f, id: fileId, status: 'success' as FileStatus } : f
        );
        const newSuccessIds = updated.filter((f) => f.status === 'success').map((f) => f.id);
        onFilesUploaded(newSuccessIds);
        return updated;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f) =>
          f.id === tempId ? { ...f, status: 'error' as FileStatus, errorMessage: message } : f
        )
      );
    }
  };

  const processFiles = useCallback(
    async (fileList: File[]) => {
      setError(null);
      const remainingSlots = MAX_FILES_PER_SESSION - totalFiles;
      if (fileList.length > remainingSlots) {
        setError(`You can only upload ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'} (max ${MAX_FILES_PER_SESSION}).`);
        return;
      }

      const validFiles: File[] = [];
      for (const file of fileList) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        validFiles.push(file);
      }

      const newFileEntries: UploadedFile[] = validFiles.map((file) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        status: 'uploading' as FileStatus,
        previewUrl: isImageFile(file.name) ? URL.createObjectURL(file) : undefined,
        file,
      }));

      setFiles((prev) => [...prev, ...newFileEntries]);

      for (let i = 0; i < validFiles.length; i++) {
        await uploadFile(validFiles[i], newFileEntries[i].id);
      }
    },
    [totalFiles, apiUrl, apiKey, authToken, sessionId, onFilesUploaded]
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;
      await processFiles(Array.from(selectedFiles));
      if (inputRef.current) inputRef.current.value = '';
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        await processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Separate images from documents for display
  const imageFiles = files.filter((f) => isImageFile(f.name));
  const docFiles = files.filter((f) => !isImageFile(f.name));

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      {canUploadMore && (
        <motion.div
          className="relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
          style={{
            borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border-default)',
            backgroundColor: isDragging
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'var(--color-surface-elevated)',
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => canUploadMore && inputRef.current?.click()}
          whileHover={canUploadMore ? { scale: 1.005 } : {}}
          whileTap={canUploadMore ? { scale: 0.995 } : {}}
          role="button"
          tabIndex={0}
          aria-label="Upload device evidence files"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <div className="flex flex-col items-center justify-center py-5 px-4">
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
              style={{
                backgroundColor: isDragging
                  ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  : 'var(--color-surface-card)',
                border: '1px solid var(--color-border-default)',
              }}
              animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
            >
              <Upload
                className="w-5 h-5"
                style={{ color: isDragging ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              />
            </motion.div>
            <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
                Click to upload
              </span>{' '}
              or drag and drop
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Images, PDF, DOCX, CSV, JSON · Max 10 MB each
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPT_STRING}
            multiple
            disabled={!canUploadMore}
            onChange={handleFileChange}
            aria-label="Upload device evidence files"
          />
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--color-error)' }}
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Image Thumbnails Grid (like ProjectSubmission) */}
      <AnimatePresence>
        {imageFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {imageFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative aspect-square rounded-lg overflow-hidden border"
                  style={{
                    borderColor: 'var(--color-border-default)',
                    backgroundColor: 'var(--color-surface-elevated)',
                  }}
                >
                  {file.previewUrl && (
                    <img
                      src={file.previewUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Status overlay */}
                  {file.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {file.status === 'success' && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle className="w-4 h-4 drop-shadow" style={{ color: 'var(--color-success)' }} />
                    </div>
                  )}
                  {file.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 60%, transparent)' }}>
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    }}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>

                  {/* Error tooltip */}
                  {file.status === 'error' && file.errorMessage && (
                    <div className="absolute bottom-0 inset-x-0 px-1.5 py-1" style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 80%, black)' }}>
                      <p className="text-[10px] text-white truncate">{file.errorMessage}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Files List */}
      <AnimatePresence>
        {docFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            {docFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border-default)',
                }}
              >
                <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  {file.name}
                </span>
                {file.status === 'uploading' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-primary)' }} />
                )}
                {file.status === 'success' && (
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0"
                  style={{
                    backgroundColor: 'var(--color-surface-card)',
                    border: '1px solid var(--color-border-default)',
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File count */}
      {totalFiles > 0 && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {successfulFileIds.length} of {MAX_FILES_PER_SESSION} files uploaded
        </p>
      )}
    </div>
  );
}
