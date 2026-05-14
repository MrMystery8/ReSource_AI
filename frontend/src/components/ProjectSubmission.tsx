import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SubmissionResult } from '@resource-ai/shared';
import {
  Upload,
  X,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Trophy,
  Star,
  Share2,
} from 'lucide-react';
import { PointsAnimation } from './gamification/PointsAnimation';
import { ShareToCommunityModal } from './community/ShareToCommunityModal';
import { ApiClient } from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;
const MAX_RETRY_ATTEMPTS = 3;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ProjectSubmissionProps {
  projectId: string;
  guideContext: {
    ideaTitle: string;
    expectedOutcome: string;
    steps: string[];
  };
  existingResult?: SubmissionResult;
  onGraded: (result: SubmissionResult) => void;
  apiUrl: string;
  apiKey: string;
  authToken?: string | null;
}

interface PhotoEntry {
  /** Temporary local ID before upload, or the returned fileId after upload */
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
  /** fileId returned by the upload API once status === 'uploaded' */
  fileId?: string;
  /** Full S3 key returned by the upload API once status === 'uploaded' */
  s3Key?: string;
}

// ── Grade display helpers ─────────────────────────────────────────────────────

const GRADE_CONFIG: Record<
  SubmissionResult['grade'],
  { label: string; color: string; bg: string; border: string }
> = {
  A: { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  B: { label: 'Good', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  C: { label: 'Satisfactory', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  D: { label: 'Needs Improvement', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  F: { label: 'Participation', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
};

// ── Utility ───────────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `"${file.name}" must be a JPEG, PNG, or WebP image.`;
    }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 5 MB size limit.`;
  }
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectSubmission({
  projectId,
  guideContext,
  existingResult,
  onGraded,
  apiUrl,
  apiKey,
  authToken,
}: ProjectSubmissionProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Result state — starts with existingResult if provided
  const [result, setResult] = useState<SubmissionResult | undefined>(existingResult);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(authToken ?? null);
  tokenRef.current = authToken ?? null;
  const apiClientRef = useRef<ApiClient>(
    new ApiClient(apiUrl, apiKey, () => tokenRef.current)
  );

  // ── Photo management ────────────────────────────────────────────────────────

  const addPhotos = useCallback(
    (files: File[]) => {
      setFileError(null);

      const remaining = MAX_PHOTOS - photos.length;
      if (files.length > remaining) {
        setFileError(
          `You can add at most ${remaining} more photo${remaining === 1 ? '' : 's'} (max ${MAX_PHOTOS}).`
        );
        return;
      }

      for (const file of files) {
        const err = validateFile(file);
        if (err) {
          setFileError(err);
          return;
        }
      }

      const newEntries: PhotoEntry[] = files.map((file) => ({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      }));

      setPhotos((prev) => [...prev, ...newEntries]);
    },
    [photos.length]
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setFileError(null);
  }, []);

  // ── Drop zone handlers ──────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;
      addPhotos(Array.from(selected));
      if (inputRef.current) inputRef.current.value = '';
    },
    [addPhotos]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) addPhotos(dropped);
    },
    [addPhotos]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ── Upload + submit flow ────────────────────────────────────────────────────

  const uploadPhoto = async (entry: PhotoEntry): Promise<string> => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === entry.id ? { ...p, status: 'uploading' } : p))
    );

    const base64 = await readFileAsBase64(entry.file);
    const data = await apiClientRef.current.uploadEvidenceFile(
      base64,
      entry.file.type || 'image/jpeg',
      entry.file.name
    );

    setPhotos((prev) =>
      prev.map((p) =>
        p.id === entry.id
          ? { ...p, status: 'uploaded', fileId: data.fileId, s3Key: data.s3Key }
          : p
      )
    );

    return data.s3Key;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    setAttemptCount((c) => c + 1);

    try {
      // Upload any photos that haven't been uploaded yet
      const toUpload = photos.filter((p) => p.status === 'pending' || p.status === 'error');
      const alreadyUploaded = photos.filter((p) => p.status === 'uploaded' && p.s3Key);

      const newFileIds: string[] = [];
      for (const entry of toUpload) {
        try {
          const s3Key = await uploadPhoto(entry);
          newFileIds.push(s3Key);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === entry.id ? { ...p, status: 'error', errorMessage: message } : p
            )
          );
          throw new Error(`Failed to upload "${entry.file.name}": ${message}`);
        }
      }

      const allFileIds = [
        ...alreadyUploaded.map((p) => p.s3Key as string),
        ...newFileIds,
      ];

      // Call POST /project/submit
      const response = await apiClientRef.current['request']('/project/submit', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          photoFileIds: allFileIds,
          guideContext,
        }),
      });

      if (!response.ok) {
        let message = `Submission failed (${response.status})`;
        try {
          const body = await response.json() as { error?: { message?: string } };
          if (body.error?.message) message = body.error.message;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }

      const submissionResult = await response.json() as {
        grade: SubmissionResult['grade'];
        points: number;
        feedback: string;
      };

      const fullResult: SubmissionResult = {
        grade: submissionResult.grade,
        points: submissionResult.points,
        feedback: submissionResult.feedback,
        photoKeys: allFileIds,
        submittedAt: new Date().toISOString(),
      };

      setResult(fullResult);
      setShowPointsAnimation(true);
      onGraded(fullResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const uploadedCount = photos.filter((p) => p.status === 'uploaded').length;
  const pendingCount = photos.filter((p) => p.status === 'pending').length;
  const readyCount = uploadedCount + pendingCount; // photos that will be submitted
  const canSubmit =
    readyCount >= MIN_PHOTOS &&
    readyCount <= MAX_PHOTOS &&
    !isSubmitting &&
    attemptCount < MAX_RETRY_ATTEMPTS + 1; // initial attempt + 3 retries = 4 total
  const retriesExhausted = attemptCount > MAX_RETRY_ATTEMPTS;
  const canAddMore = photos.length < MAX_PHOTOS && !isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Points animation overlay */}
      <div className="relative">
        <PointsAnimation
          points={result?.points ?? 0}
          visible={showPointsAnimation}
          onComplete={() => setShowPointsAnimation(false)}
        />
      </div>

      {/* Result display (shown after grading or if existingResult provided) */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-5 ${GRADE_CONFIG[result.grade].bg} ${GRADE_CONFIG[result.grade].border}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 ${GRADE_CONFIG[result.grade].bg} border ${GRADE_CONFIG[result.grade].border}`}
            >
              <span className={GRADE_CONFIG[result.grade].color}>{result.grade}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className={`w-4 h-4 ${GRADE_CONFIG[result.grade].color}`} />
                <span className={`text-sm font-semibold ${GRADE_CONFIG[result.grade].color}`}>
                  {GRADE_CONFIG[result.grade].label}
                </span>
                <span className="ml-auto flex items-center gap-1 text-sm font-bold text-emerald-400">
                  <Star className="w-3.5 h-3.5" />
                  +{result.points} pts
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.feedback}</p>
              <p className="text-xs text-text-muted mt-2">
                Submitted {new Date(result.submittedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Resubmission notice */}
          <p className="mt-3 text-xs text-text-muted border-t border-current/10 pt-3">
            You can resubmit to replace this result with a new grade.
          </p>

          {/* Share to Community button */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
          >
            <Share2 className="w-4 h-4" />
            Share to Community
          </button>
        </motion.div>
      )}

      {/* Photo upload area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-primary">Project Photos</span>
            <span className="text-rose-400 text-xs" aria-label="required">*</span>
          </div>
          <span
            className={`text-xs font-medium ${
              readyCount < MIN_PHOTOS || readyCount > MAX_PHOTOS
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}
            aria-live="polite"
          >
            {readyCount}/{MAX_PHOTOS} photos
          </span>
        </div>

        {/* Count requirement message */}
        <p className="text-xs text-text-muted mb-3">
          Upload {MIN_PHOTOS}–{MAX_PHOTOS} photos of your completed project (JPEG, PNG, or WebP · max 5 MB each)
        </p>

        {/* Drop zone */}
        {canAddMore && (
          <motion.div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
              isDragging
                ? 'border-primary-400 bg-primary-500/10'
                : 'border-border-subtle hover:border-primary-500/40 hover:bg-surface-elevated/30'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            role="button"
            tabIndex={0}
            aria-label="Upload project photos"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
          >
            <div className="flex flex-col items-center justify-center py-6 px-4">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                  isDragging ? 'bg-primary-500/20' : 'bg-surface-elevated'
                }`}
                animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
              >
                <Upload className={`w-5 h-5 ${isDragging ? 'text-primary-400' : 'text-text-muted'}`} />
              </motion.div>
              <p className="text-sm text-text-secondary text-center">
                <span className="text-primary-400 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-text-muted mt-1">JPEG, PNG, WebP · max 5 MB each</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              aria-label="Select project photos"
            />
          </motion.div>
        )}

        {/* File validation error */}
        <AnimatePresence>
          {fileError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 text-xs text-rose-400 flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fileError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Photo thumbnails */}
        <AnimatePresence>
          {photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 grid grid-cols-3 gap-2"
            >
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border-subtle bg-surface-elevated/40"
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Status overlay */}
                  {photo.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {photo.status === 'uploaded' && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle className="w-4 h-4 text-emerald-400 drop-shadow" />
                    </div>
                  )}
                  {photo.status === 'error' && (
                    <div className="absolute inset-0 bg-rose-900/60 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-rose-300" />
                    </div>
                  )}

                  {/* Remove button */}
                  {!isSubmitting && (
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      aria-label={`Remove ${photo.file.name}`}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}

                  {/* Error tooltip */}
                  {photo.status === 'error' && photo.errorMessage && (
                    <div className="absolute bottom-0 inset-x-0 bg-rose-900/80 px-1.5 py-1">
                      <p className="text-[10px] text-rose-200 truncate">{photo.errorMessage}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit error */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-rose-300">{submitError}</p>
              {retriesExhausted && (
                <p className="text-xs text-rose-400/70 mt-1">
                  Maximum retry attempts reached. Please refresh the page to try again.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <div>
        {/* Count requirement hint */}
        {readyCount < MIN_PHOTOS && (
          <p className="text-xs text-text-muted mb-2 text-center">
            Add at least {MIN_PHOTOS - readyCount} more photo{MIN_PHOTOS - readyCount === 1 ? '' : 's'} to submit
          </p>
        )}

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full relative overflow-hidden rounded-xl px-6 py-3.5 font-medium text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
          whileHover={canSubmit ? { scale: 1.01 } : {}}
          whileTap={canSubmit ? { scale: 0.99 } : {}}
        >
          {/* Button gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />

          <span className="relative flex items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Grading your project…</span>
              </>
            ) : submitError && !retriesExhausted ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Retry Submission ({MAX_RETRY_ATTEMPTS - attemptCount + 1} attempt{MAX_RETRY_ATTEMPTS - attemptCount + 1 === 1 ? '' : 's'} left)</span>
              </>
            ) : result ? (
              <>
                <Upload className="w-4 h-4" />
                <span>Resubmit Project</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Submit for Grading</span>
              </>
            )}
          </span>
        </motion.button>
      </div>

      {/* Share to Community Modal */}
      {result && (
        <ShareToCommunityModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectId={projectId}
          ideaTitle={guideContext.ideaTitle}
          grade={result.grade}
          photoKeys={result.photoKeys}
          photoUrls={photos.filter((p) => p.status === 'uploaded').map((p) => p.previewUrl)}
        />
      )}
    </div>
  );
}

export default ProjectSubmission;
