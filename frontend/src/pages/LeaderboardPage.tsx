import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type { LeaderboardResponse, LeaderboardEntry, UserLevel } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

const LEVEL_COLORS: Record<UserLevel, { text: string; bg: string; border: string }> = {
  Recycler: {
    text: 'text-primary-700',
    bg: 'bg-primary-50',
    border: 'border-primary-200',
  },
  Salvager: {
    text: 'text-info-600',
    bg: 'bg-info-50',
    border: 'border-info-100',
  },
  'E-Waste Champion': {
    text: 'text-accent-600',
    bg: 'bg-accent-50',
    border: 'border-accent-200',
  },
  'Green Guardian': {
    text: 'text-warning-600',
    bg: 'bg-warning-50',
    border: 'border-warning-100',
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1] as const,
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

  const currentUserInList = data?.entries.some((entry) => entry.isCurrentUser) ?? false;
  const currentUserRank = data?.currentUserRank;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-accent-500" />
          Leaderboard
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Top recyclers ranked by points
        </p>
      </div>

      {/* Main Content */}
      <div className="card p-5 sm:p-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLeaderboard} />
        ) : data && data.entries.length > 0 ? (
          <>
            <LeaderboardTable entries={data.entries} />

            {!currentUserInList && currentUserRank !== null && (
              <div className="mt-5 pt-4 border-t border-border-subtle">
                <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-primary-50 border border-primary-200">
                  <span className="text-sm text-primary-700">
                    Your rank: <span className="font-semibold">#{currentUserRank}</span>
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </motion.div>
  );
}

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-border-default">
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide py-2.5 px-3 w-14">
              Rank
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide py-2.5 px-3">
              Player
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide py-2.5 px-3 hidden sm:table-cell">
              Level
            </th>
            <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wide py-2.5 px-3">
              Points
            </th>
            <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wide py-2.5 px-3 hidden sm:table-cell">
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

  return (
    <motion.tr
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className={`border-b border-border-subtle transition-colors ${
        entry.isCurrentUser
          ? 'bg-primary-50'
          : 'hover:bg-stone-50'
      }`}
    >
      {/* Rank */}
      <td className="py-3 px-3">
        {entry.rank <= 3 ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent-50 border border-accent-200 text-xs font-bold text-accent-700">
            {entry.rank}
          </span>
        ) : (
          <span className="text-sm font-medium text-text-secondary tabular-nums pl-1.5">
            {entry.rank}
          </span>
        )}
      </td>

      {/* Display Name */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              entry.isCurrentUser ? 'text-primary-700' : 'text-text-primary'
            }`}
          >
            {entry.displayName}
          </span>
          {entry.isCurrentUser && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 border border-primary-200 text-primary-700">
              You
            </span>
          )}
        </div>
      </td>

      {/* Level Badge */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span
          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${levelColors.bg} ${levelColors.border} ${levelColors.text}`}
        >
          {entry.level}
        </span>
      </td>

      {/* Points */}
      <td className="py-3 px-3 text-right">
        <span className="text-sm font-semibold text-text-primary tabular-nums">
          {entry.points.toLocaleString()}
        </span>
      </td>

      {/* Badge Count */}
      <td className="py-3 px-3 text-right hidden sm:table-cell">
        <span className="text-sm text-text-secondary tabular-nums">
          {entry.badgeCount}
        </span>
      </td>
    </motion.tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading leaderboard">
      <div className="flex items-center gap-4 py-3 border-b border-border-default">
        <div className="h-3 w-10 rounded bg-stone-200" />
        <div className="h-3 w-28 rounded bg-stone-200" />
        <div className="h-3 w-20 rounded bg-stone-200 hidden sm:block" />
        <div className="h-3 w-14 rounded bg-stone-200 ml-auto" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-5 w-7 rounded-full bg-stone-100" />
          <div className="h-4 w-24 rounded bg-stone-100" />
          <div className="h-5 w-20 rounded-full bg-stone-100 hidden sm:block" />
          <div className="h-4 w-12 rounded bg-stone-100 ml-auto" />
          <div className="h-4 w-6 rounded bg-stone-100 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
      <p className="text-text-primary text-sm font-medium mb-1">Unable to load leaderboard</p>
      <p className="text-text-muted text-xs mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-stone-100 border border-border-default text-text-primary text-sm font-medium hover:bg-stone-200 transition-colors"
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
      <Trophy className="w-10 h-10 text-stone-300 mx-auto mb-3" />
      <p className="text-text-primary text-sm font-medium">No leaderboard data yet</p>
      <p className="text-text-muted text-xs mt-1">
        Complete triage sessions to earn points and appear here.
      </p>
    </div>
  );
}
