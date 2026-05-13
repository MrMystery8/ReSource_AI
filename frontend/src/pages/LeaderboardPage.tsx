import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type { LeaderboardResponse, LeaderboardEntry, UserLevel } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// Medal icons for top 3 ranks
const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

// Level color mapping (matches ProfilePage)
const LEVEL_COLORS: Record<UserLevel, { text: string; bg: string; border: string }> = {
  Recycler: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  Salvager: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  'E-Waste Champion': {
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  'Green Guardian': {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
};

// Row animation variants
const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as const,
    },
  }),
};

export function LeaderboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = new ApiClient(API_URL, API_KEY, () => token);
      const response = await client.getLeaderboard();
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Check if current user is in the displayed entries
  const currentUserInList = data?.entries.some((entry) => entry.isCurrentUser) ?? false;
  const currentUserRank = data?.currentUserRank;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Leaderboard
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Top recyclers ranked by points
        </p>
      </div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLeaderboard} />
        ) : data && data.entries.length > 0 ? (
          <>
            <LeaderboardTable entries={data.entries} />

            {/* Show current user's rank if not in top 20 */}
            {!currentUserInList && currentUserRank !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 pt-4 border-t border-white/10"
              >
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
                  <span className="text-sm text-primary-300">
                    Your rank: <span className="font-bold text-white">#{currentUserRank}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ───

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide py-3 px-3 w-16">
              Rank
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide py-3 px-3">
              Player
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide py-3 px-3 hidden sm:table-cell">
              Level
            </th>
            <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wide py-3 px-3">
              Points
            </th>
            <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wide py-3 px-3 hidden sm:table-cell">
              Badges
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <LeaderboardRow key={entry.rank} entry={entry} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const levelColors = LEVEL_COLORS[entry.level];
  const medal = RANK_MEDALS[entry.rank];

  return (
    <motion.tr
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className={`border-b border-white/5 transition-colors ${
        entry.isCurrentUser
          ? 'bg-primary-500/10 border-l-2 border-l-primary-500'
          : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Rank */}
      <td className="py-3 px-3">
        {medal ? (
          <span className="text-xl" role="img" aria-label={`Rank ${entry.rank}`}>
            {medal}
          </span>
        ) : (
          <span className="text-sm font-semibold text-text-secondary">
            #{entry.rank}
          </span>
        )}
      </td>

      {/* Display Name */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              entry.isCurrentUser ? 'text-primary-300' : 'text-white'
            }`}
          >
            {entry.displayName}
          </span>
          {entry.isCurrentUser && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300">
              You
            </span>
          )}
        </div>
      </td>

      {/* Level Badge */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span
          className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${levelColors.bg} border ${levelColors.border} ${levelColors.text}`}
        >
          {entry.level}
        </span>
      </td>

      {/* Points */}
      <td className="py-3 px-3 text-right">
        <span className="text-sm font-semibold text-white">
          {entry.points.toLocaleString()}
        </span>
      </td>

      {/* Badge Count */}
      <td className="py-3 px-3 text-right hidden sm:table-cell">
        <span className="text-sm text-text-secondary">
          {entry.badgeCount}
        </span>
      </td>
    </motion.tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header row skeleton */}
      <div className="flex items-center gap-4 py-3 border-b border-white/10">
        <div className="h-3 w-12 rounded bg-white/5" />
        <div className="h-3 w-32 rounded bg-white/5" />
        <div className="h-3 w-20 rounded bg-white/5 hidden sm:block" />
        <div className="h-3 w-16 rounded bg-white/5 ml-auto" />
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-5 w-8 rounded bg-white/5" />
          <div className="h-4 w-28 rounded bg-white/5" />
          <div className="h-5 w-24 rounded-full bg-white/5 hidden sm:block" />
          <div className="h-4 w-14 rounded bg-white/5 ml-auto" />
          <div className="h-4 w-6 rounded bg-white/5 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-10 h-10 text-text-muted mx-auto mb-3" />
      <p className="text-text-secondary text-sm mb-1">Unable to load leaderboard</p>
      <p className="text-text-muted text-xs mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm font-medium hover:bg-primary-500/20 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Trophy className="w-10 h-10 text-text-muted mx-auto mb-3" />
      <p className="text-text-secondary text-sm">No leaderboard data yet</p>
      <p className="text-text-muted text-xs mt-1">
        Complete triage sessions to earn points and appear on the leaderboard.
      </p>
    </div>
  );
}
