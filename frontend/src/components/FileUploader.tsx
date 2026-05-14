import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SESSION,
  ALLOWED_FILE_EXTENSIONS,
} from '@resource-ai/shared';
import { Upload, FileCheck, AlertCircle, Image, FileText } from 'lucide-react';
import { ApiClient } from '../services/api';
import { Button } from './ui/Button';

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

const ALLOWED_MIME_TYPES = Object.values(EXTENSION_TO_MIME);
const ACCEPT_STRING = (ALLOWED_FILE_EXTENSIONS as readonly string[]).join(',');

export type FileStatus = 'uploading' | 'success' | 'error';

export interface UploadedFile {
  id: string;
  name: string;
  status: FileStatus;
  errorMessage?: string;
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

  const isImageFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Upload className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Device Evidence
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
      </div>

      {/* Drop Zone */}
      <motion.div
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
          !canUploadMore ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border-default)',
          backgroundColor: isDragging ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface-elevated)',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => canUploadMore && inputRef.current?.click()}
        whileHover={canUploadMore ? { scale: 1.005 } : {}}
        whileTap={canUploadMore ? { scale: 0.995 } : {}}
      >
        <div className="flex flex-col items-center justify-center py-6 px-4">
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)' }}
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
            Images, PDF, DOCX, CSV, JSON • Max 10 MB each
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

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs flex items-center gap-1.5"
          style={{ color: 'var(--color-error)' }}
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </motion.p>
      )}

      {/* File List */}
      <AnimatePresence>
        {totalFiles > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {successfulFileIds.length} of {MAX_FILES_PER_SESSION} files uploaded
            </p>
            <ul className="space-y-1.5" aria-label="Uploaded files">
              {files.map((file) => (
                <motion.li
                  key={file.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border-default)',
                  }}
                >
                  {isImageFile(file.name) ? (
                    <Image className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  ) : (
                    <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  )}
                  <span className="text-sm truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    {file.name}
                  </span>
                  {file.status === 'uploading' && (
                    <motion.div
                      className="w-3.5 h-3.5 border-2 rounded-full"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)', borderTopColor: 'var(--color-primary)' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  {file.status === 'success' && (
                    <FileCheck className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
