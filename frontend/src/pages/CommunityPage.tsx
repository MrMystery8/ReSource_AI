import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Send,
  Trophy,
  Star,
  Filter,
  Clock,
  TrendingUp,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import type {
  CommunityPost,
  CommunityComment,
  VoteType,
  CommunityFeedResponse,
} from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// --- Grade badge config ---
const GRADE_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  A: { color: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)', border: 'color-mix(in srgb, var(--color-success) 30%, transparent)' },
  B: { color: '#2dd4bf', bg: 'color-mix(in srgb, #2dd4bf 12%, transparent)', border: 'color-mix(in srgb, #2dd4bf 30%, transparent)' },
  C: { color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', border: 'color-mix(in srgb, var(--color-warning) 30%, transparent)' },
  D: { color: '#fb923c', bg: 'color-mix(in srgb, #fb923c 12%, transparent)', border: 'color-mix(in srgb, #fb923c 30%, transparent)' },
  F: { color: 'var(--color-error)', bg: 'color-mix(in srgb, var(--color-error) 12%, transparent)', border: 'color-mix(in srgb, var(--color-error) 30%, transparent)' },
};

// --- Post Card Component ---

function CommunityPostCard({
  post,
  onVote,
  onToggleComments,
  isCommentsOpen,
}: {
  post: CommunityPost;
  onVote: (postId: string, vote: VoteType) => void;
  onToggleComments: (postId: string) => void;
  isCommentsOpen: boolean;
}) {
  const gradeStyle = GRADE_STYLES[post.grade] ?? GRADE_STYLES.C;
  const netVotes = post.upvotes - post.downvotes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card elevation="md" className="overflow-hidden">
        {/* Post Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              aria-hidden="true"
            >
              {post.displayName
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {post.displayName}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            {/* Grade badge */}
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                color: gradeStyle.color,
                backgroundColor: gradeStyle.bg,
                border: `1px solid ${gradeStyle.border}`,
              }}
            >
              <Trophy className="w-3 h-3" aria-hidden="true" />
              Grade {post.grade}
            </span>
          </div>

          {/* Project title */}
          <p
            className="mt-2 text-xs font-medium px-2 py-1 rounded-md inline-block"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {post.ideaTitle}
          </p>

          {/* Post text */}
          <p
            className="mt-3 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {post.text}
          </p>
        </div>

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div
            className={`grid gap-1 ${
              post.imageUrls.length === 1
                ? 'grid-cols-1'
                : post.imageUrls.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 sm:grid-cols-3'
            }`}
            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
          >
            {post.imageUrls.filter(Boolean).map((url, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden ${
                  post.imageUrls!.length === 1 ? 'aspect-video' : 'aspect-square'
                }`}
                style={{ backgroundColor: 'var(--color-surface-elevated)' }}
              >
                <img
                  src={url}
                  alt={`Project photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div
          className="flex items-center gap-1 px-4 py-2.5"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}
        >
          {/* Upvote */}
          <button
            type="button"
            onClick={() => onVote(post.postId, 'upvote')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px]"
            style={{
              color: post.currentUserVote === 'upvote' ? 'var(--color-success)' : 'var(--color-text-muted)',
              backgroundColor: post.currentUserVote === 'upvote'
                ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                : 'transparent',
            }}
            aria-label={`Upvote (${post.upvotes})`}
            aria-pressed={post.currentUserVote === 'upvote'}
          >
            <ArrowBigUp
              className="w-5 h-5"
              fill={post.currentUserVote === 'upvote' ? 'currentColor' : 'none'}
            />
          </button>

          {/* Vote count */}
          <span
            className="text-sm font-semibold tabular-nums min-w-[24px] text-center"
            style={{
              color: netVotes > 0
                ? 'var(--color-success)'
                : netVotes < 0
                  ? 'var(--color-error)'
                  : 'var(--color-text-muted)',
            }}
          >
            {netVotes}
          </span>

          {/* Downvote */}
          <button
            type="button"
            onClick={() => onVote(post.postId, 'downvote')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px]"
            style={{
              color: post.currentUserVote === 'downvote' ? 'var(--color-error)' : 'var(--color-text-muted)',
              backgroundColor: post.currentUserVote === 'downvote'
                ? 'color-mix(in srgb, var(--color-error) 12%, transparent)'
                : 'transparent',
            }}
            aria-label={`Downvote (${post.downvotes})`}
            aria-pressed={post.currentUserVote === 'downvote'}
          >
            <ArrowBigDown
              className="w-5 h-5"
              fill={post.currentUserVote === 'downvote' ? 'currentColor' : 'none'}
            />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Comments toggle */}
          <button
            type="button"
            onClick={() => onToggleComments(post.postId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            style={{
              color: isCommentsOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
              backgroundColor: isCommentsOpen
                ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                : 'transparent',
            }}
            aria-expanded={isCommentsOpen}
            aria-label={`Comments (${post.commentCount})`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium tabular-nums">{post.commentCount}</span>
            {isCommentsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

// --- Comments Section ---

function CommentsSection({
  postId,
  apiClient,
}: {
  postId: string;
  apiClient: ApiClient;
}) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getCommunityComments(postId);
      setComments(data.comments);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [postId, apiClient]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await apiClient.createCommunityComment(postId, newComment.trim());
      setComments((prev) => [...prev, result.comment]);
      setNewComment('');
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className="px-4 pb-4 pt-1 space-y-3"
        style={{ borderTop: '1px solid var(--color-border-subtle)' }}
      >
        {/* Comment input */}
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Write a comment..."
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
            aria-label="Write a comment"
          />
          <button
            type="button"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            className="p-2 rounded-lg transition-colors disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
            }}
            aria-label="Submit comment"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Comments list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={48} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.commentId}
                className="flex gap-2 p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--color-surface-elevated)' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                  aria-hidden="true"
                >
                  {comment.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {comment.displayName}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(comment.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {comment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Main Page ---

export function CommunityPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'top'>('recent');
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const apiClient = new ApiClient(API_URL, API_KEY, () => token);

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const client = new ApiClient(API_URL, API_KEY, () => token);
      const data = await client.getCommunityFeed({ sort: sortBy, limit: 30 });
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community feed');
    } finally {
      setIsLoading(false);
    }
  }, [token, sortBy]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleVote = async (postId: string, vote: VoteType) => {
    try {
      const result = await apiClient.voteCommunityPost(postId, vote);
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId
            ? {
                ...p,
                upvotes: result.upvotes,
                downvotes: result.downvotes,
                currentUserVote: result.currentUserVote,
              }
            : p
        )
      );
    } catch {
      // silently fail
    }
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto pb-8 space-y-5"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Users className="w-6 h-6" style={{ color: 'var(--color-primary)' }} aria-hidden />
            Community
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            See what others are building from e-waste
          </p>
        </div>

        {/* Sort toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-border-default)' }}
          role="group"
          aria-label="Sort posts"
        >
          <button
            type="button"
            onClick={() => setSortBy('recent')}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors min-h-[36px]"
            style={{
              backgroundColor: sortBy === 'recent' ? 'var(--color-primary)' : 'transparent',
              color: sortBy === 'recent' ? '#fff' : 'var(--color-text-muted)',
            }}
            aria-pressed={sortBy === 'recent'}
          >
            <Clock className="w-3.5 h-3.5" />
            Recent
          </button>
          <button
            type="button"
            onClick={() => setSortBy('top')}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors min-h-[36px]"
            style={{
              backgroundColor: sortBy === 'top' ? 'var(--color-primary)' : 'transparent',
              color: sortBy === 'top' ? '#fff' : 'var(--color-text-muted)',
            }}
            aria-pressed={sortBy === 'top'}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Top
          </button>
        </div>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} elevation="md" className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton variant="circular" width={36} height={36} />
                <div className="space-y-1.5">
                  <Skeleton variant="text" width={120} height={14} />
                  <Skeleton variant="text" width={80} height={10} />
                </div>
              </div>
              <Skeleton variant="text" width="90%" height={14} />
              <Skeleton variant="text" width="70%" height={14} className="mt-1" />
              <Skeleton variant="rectangular" height={200} className="mt-3 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchFeed} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No posts yet"
          description="Be the first to share your recycled creation with the community! Complete a project and share it from the results screen."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.postId}>
              <CommunityPostCard
                post={post}
                onVote={handleVote}
                onToggleComments={toggleComments}
                isCommentsOpen={openComments.has(post.postId)}
              />
              <AnimatePresence>
                {openComments.has(post.postId) && (
                  <Card elevation="sm" className="mt-1 overflow-hidden">
                    <CommentsSection postId={post.postId} apiClient={apiClient} />
                  </Card>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
