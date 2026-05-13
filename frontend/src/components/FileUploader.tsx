import { useState, useRef, useCallback } from 'react';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SESSION,
  ALLOWED_FILE_EXTENSIONS,
} from '@resource-ai/shared';
import './FileUploader.css';

/** Allowed MIME types mapped from the shared constants extensions. */
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

/** Accept string for the file input element. */
const ACCEPT_STRING = (ALLOWED_FILE_EXTENSIONS as readonly string[]).join(',');

export type FileStatus = 'uploading' | 'success' | 'error';

export interface UploadedFile {
  id: string;
  name: string;
  status: FileStatus;
  errorMessage?: string;
}

export interface FileUploaderProps {
  /** Base URL for the API (e.g. https://xyz.execute-api.region.amazonaws.com/prod) */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Session ID to associate uploads with */
  sessionId?: string;
  /** Callback invoked whenever the set of successfully uploaded file IDs changes */
  onFilesUploaded: (fileIds: string[]) => void;
}

/**
 * FileUploader component handles file selection, client-side validation,
 * upload to the POST /upload endpoint, and displays per-file status.
 */
export function FileUploader({ apiUrl, apiKey, sessionId, onFilesUploaded }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const successfulFileIds = files
    .filter((f) => f.status === 'success')
    .map((f) => f.id);

  const totalFiles = files.length;
  const canUploadMore = totalFiles < MAX_FILES_PER_SESSION;

  /**
   * Reads a File as a base64 string (without the data URL prefix).
   */
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Validates a single file against size and type constraints.
   * Returns an error message or null if valid.
   */
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" exceeds the 10 MB size limit.`;
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      // Fallback: check extension
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
        return `File "${file.name}" has an unsupported format. Allowed: ${(ALLOWED_FILE_EXTENSIONS as readonly string[]).join(', ')}`;
      }
    }

    return null;
  };

  /**
   * Uploads a single file to the backend.
   */
  const uploadFile = async (file: File, tempId: string): Promise<void> => {
    try {
      const base64Body = await readFileAsBase64(file);

      const headers: Record<string, string> = {
        'Content-Type': file.type || 'application/octet-stream',
        'x-api-key': apiKey,
      };

      if (sessionId) {
        headers['x-session-id'] = sessionId;
      }

      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers,
        body: base64Body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error?.message ?? `Upload failed with status ${response.status}`;
        throw new Error(message);
      }

      const data = await response.json();
      const fileId = data.fileId as string;

      // Update file status to success
      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === tempId ? { ...f, id: fileId, status: 'success' as FileStatus } : f
        );
        // Notify parent with updated successful IDs
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

  /**
   * Handles file input change event.
   */
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const selectedFiles = event.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      const filesToProcess = Array.from(selectedFiles);

      // Check total count limit
      const remainingSlots = MAX_FILES_PER_SESSION - totalFiles;
      if (filesToProcess.length > remainingSlots) {
        setError(
          `You can only upload ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'} (max ${MAX_FILES_PER_SESSION} per session).`
        );
        // Reset input
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      // Validate each file
      const validFiles: File[] = [];
      for (const file of filesToProcess) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          if (inputRef.current) inputRef.current.value = '';
          return;
        }
        validFiles.push(file);
      }

      // Add files with uploading status
      const newFileEntries: UploadedFile[] = validFiles.map((file) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        status: 'uploading' as FileStatus,
      }));

      setFiles((prev) => [...prev, ...newFileEntries]);

      // Reset input so the same file can be selected again
      if (inputRef.current) inputRef.current.value = '';

      // Upload each file
      for (let i = 0; i < validFiles.length; i++) {
        await uploadFile(validFiles[i], newFileEntries[i].id);
      }
    },
    [totalFiles, apiUrl, apiKey, sessionId, onFilesUploaded]
  );

  return (
    <div className="file-uploader">
      <label className="file-uploader__label">
        Device Evidence
        <span className="file-uploader__optional">(optional)</span>
      </label>
      <p className="file-uploader__hint">
        Upload photos or documents of your device to improve triage accuracy.
        Supported: images, PDF, DOCX, PPTX, HTML, CSV, JSON. Max 10 MB each.
      </p>

      <div className="file-uploader__input-wrapper">
        <input
          ref={inputRef}
          type="file"
          className="file-uploader__input"
          accept={ACCEPT_STRING}
          multiple
          disabled={!canUploadMore}
          onChange={handleFileChange}
          aria-label="Upload device evidence files"
        />
      </div>

      {error && <p className="file-uploader__error" role="alert">{error}</p>}

      {totalFiles > 0 && (
        <>
          <p className="file-uploader__count">
            {successfulFileIds.length} of {MAX_FILES_PER_SESSION} files uploaded
          </p>
          <ul className="file-uploader__file-list" aria-label="Uploaded files">
            {files.map((file) => (
              <li key={file.id} className="file-uploader__file-item">
                <span className="file-uploader__file-name">{file.name}</span>
                <span
                  className={`file-uploader__file-status file-uploader__file-status--${file.status}`}
                >
                  {file.status === 'uploading' && 'Uploading…'}
                  {file.status === 'success' && 'Uploaded'}
                  {file.status === 'error' && (file.errorMessage ?? 'Error')}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
