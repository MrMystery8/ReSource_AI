import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Recycle,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type { SessionSummary } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const PAGE_SIZE = 10;

/** Format a date string into a human-readable relative or absolute format */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes < 2) return 'Just now';
      return `${diffMinutes} minutes ago`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Get risk level badge color classes */
function getRiskBadgeClasses(riskLevel: string | null): string {
  switch (riskLevel) {
    case 'Green':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'Yellow':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'Orange':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'Red':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

/** Get status icon and label */
function StatusIndicator({ status }: { status: SessionSummary['status'] }) {
  switch (status) {
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case 'complete':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-rose-300">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
  }
}

export function HistoryPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = sessions.length < total;

  const fetchSessions = useCallback(
    async (offset: number, append: boolean) => {
      if (!token) return;

      const client = new ApiClient(API_URL, API_KEY, () => token);

      try {
        const data = await client.getUserSessions(PAGE_SIZE, offset);
        if (append) {
          setSessions((prev) => [...prev, ...data.sessions]);
        } else {
          setSessions(data.sessions);
        }
        setTotal(data.total);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load sessions';
        setError(message);
      }
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchSessions(0, false).finally(() => setIsLoading(false));
  }, [fetchSessions]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchSessions(sessions.length, true);
    setIsLoadingMore(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-text-secondary text-sm">Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 w-full max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to load history</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              setError(null);
              fetchSessions(0, false).finally(() => setIsLoading(false));
            }}
            className="px-4 py-2 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0 && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="glass-card p-10 w-full max-w-md text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6"
          >
            <Inbox className="w-10 h-10 text-primary-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-2">No sessions yet</h2>
          <p className="text-text-secondary text-sm mb-6">
            Start your first e-waste triage to see your history here.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-500 transition-colors"
          >
            <Recycle className="w-4 h-4" />
            Start your first triage
          </Link>
        </div>
      </motion.div>
    );
  }

  // Sessions list
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Session History</h1>
        <p className="text-text-secondary text-sm mt-1">
          {total} session{total !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Error banner (for load-more errors) */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm">{error}</p>
        </div>
      )}

      {/* Session cards */}
      <div className="space-y-3">
        {sessions.map((session, index) => (
          <motion.div
            key={session.sessionId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index < PAGE_SIZE ? index * 0.05 : 0 }}
          >
            <Link
              to={`/history/${session.sessionId}`}
              className="block glass-card p-4 hover:bg-surface-elevated/60 transition-colors group"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: device info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-white font-medium truncate">
                      {session.deviceName || 'Unknown Device'}
                    </h3>
                    {session.riskLevel && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeClasses(session.riskLevel)}`}
                      >
                        {session.riskLevel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    {session.salvageScore !== null && (
                      <span className="text-text-secondary">
                        Salvage: <span className="text-white font-medium">{session.salvageScore}%</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Right: status + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <StatusIndicator status={session.status} />
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-400 transition-colors" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-surface-elevated/50 border border-border-subtle hover:bg-surface-elevated/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>Load More</>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
