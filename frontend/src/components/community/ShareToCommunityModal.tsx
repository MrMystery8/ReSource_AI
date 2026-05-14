import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Share2,
  Image,
  Check,
  Loader2,
  Star,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiClient } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

export interface ShareToCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  ideaTitle: string;
  grade: string;
  photoKeys: string[];
  photoUrls: string[];
}

export function ShareToCommunityModal({
  isOpen,
  onClose,
  projectId,
  ideaTitle,
  grade,
  photoKeys,
  photoUrls,
}: ShareToCommunityModalProps) {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [text, setText] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(
    new Set(photoKeys.map((_, i) => i))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);

  const togglePhoto = (index: number) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (next.size <= 1) return prev; // Must keep at least 1
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handlePost = useCallback(async () => {
    if (!text.trim()) {
      setError('Please add some text to your post');
      return;
    }
    if (selectedPhotos.size === 0) {
      setError('Please select at least 1 photo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const client = new ApiClient(API_URL, API_KEY, () => token);
      const selectedKeys = Array.from(selectedPhotos).map((i) => photoKeys[i]);

      const result = await client.createCommunityPost({
        projectId,
        text: text.trim(),
        imageKeys: selectedKeys,
      });

      setPointsAwarded(result.pointsAwarded);

      // Brief delay to show points, then navigate
      setTimeout(() => {
        onClose();
        navigate('/community');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share post');
      setIsSubmitting(false);
    }
  }, [text, selectedPhotos, photoKeys, projectId, token, onClose, navigate]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 max-h-[80vh] overflow-y-auto rounded-2xl"
            style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-border-default)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border-default)' }}
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                <h2
                  id="share-modal-title"
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Share to Community
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success state */}
            {pointsAwarded !== null ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                    border: '2px solid var(--color-success)',
                  }}
                >
                  <Check className="w-8 h-8" style={{ color: 'var(--color-success)' }} />
                </motion.div>
                <p
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Shared successfully!
                </p>
                <p className="flex items-center justify-center gap-1 mt-2 text-sm font-bold" style={{ color: 'var(--color-success)' }}>
                  <Star className="w-4 h-4" />
                  +{pointsAwarded} points earned
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Redirecting to community...
                </p>
              </motion.div>
            ) : (
              <>
                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* User info */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                    >
                      {user?.displayName
                        ?.split(' ')
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join('') ?? 'U'}
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {user?.displayName ?? 'User'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Sharing: {ideaTitle} · Grade {grade}
                      </p>
                    </div>
                  </div>

                  {/* Text input */}
                  <div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Tell the community about your project..."
                      maxLength={2000}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-colors focus:outline-none"
                      style={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border-default)',
                        color: 'var(--color-text-primary)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-default)';
                      }}
                      aria-label="Post text"
                    />
                    <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
                      {text.length}/2000
                    </p>
                  </div>

                  {/* Photo selection */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        Select photos to share ({selectedPhotos.size}/{photoUrls.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {photoUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => togglePhoto(idx)}
                          className="relative aspect-square rounded-lg overflow-hidden transition-all"
                          style={{
                            border: selectedPhotos.has(idx)
                              ? '2px solid var(--color-primary)'
                              : '2px solid var(--color-border-subtle)',
                            opacity: selectedPhotos.has(idx) ? 1 : 0.5,
                          }}
                          aria-label={`${selectedPhotos.has(idx) ? 'Deselect' : 'Select'} photo ${idx + 1}`}
                          aria-pressed={selectedPhotos.has(idx)}
                        >
                          <img
                            src={url}
                            alt={`Project photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {selectedPhotos.has(idx) && (
                            <div
                              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs flex items-center gap-1.5"
                      style={{ color: 'var(--color-error)' }}
                      role="alert"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {error}
                    </motion.p>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ borderTop: '1px solid var(--color-border-default)' }}
                >
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Star className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
                    +75 points for sharing
                  </p>
                  <button
                    type="button"
                    onClick={handlePost}
                    disabled={isSubmitting || !text.trim() || selectedPhotos.size === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
