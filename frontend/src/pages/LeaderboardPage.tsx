/**
 * LeaderboardPage.tsx
 *
 * Visual refresh for the UI/UX revamp:
 *   - glass-card → Card component (elevation="md")
 *   - Emoji rank medals (🥇🥈🥉) → Lucide SVG icons (Trophy / Award / Medal)
 *   - Points column uses tabular-nums for monospaced digit alignment
 *   - Table scrolls horizontally within the Card on narrow viewports (Req 9.3)
 *   - Local LoadingSkeleton → Skeleton component from design system
 *   - Local ErrorState → ErrorState component from design system
 *   - Local EmptyState → EmptyState component from design system
 *   - All data fetching, state management, and display logic unchanged
 *
 * Validates: Requirements 7.4, 3.5, 9.3, 11.4
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Medal, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import type { LeaderboardResponse, LeaderboardEntry, UserLevel } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Rank icon config — replaces emoji medals (Requirement 7.4)
// ---------------------------------------------------------------------------

interface RankIconConfig {
  Icon: LucideIcon;
  color: string;
  label: string;
}

const RANK_ICONS: Record<number, RankIconConfig> = {
  1: { Icon: Trophy, color: 'var(--color-warning, #f59e0b)', label: 'Rank 1 — Gold' },
  2: { Icon: Award,  color: '#94a3b8',                       label: 'Rank 2 — Silver' },
  3: { Icon: Medal,  color: '#b45309',                       label: 'Rank 3 — Bronze' },
};

// ---------------------------------------------------------------------------
// Level color mapping (matches ProfilePage)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Row animation variants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

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
      className="max-w-4xl mx-auto px-4 pb-8 space-y-6"
    >
      {/* Page Header */}
      <div className="mb-2">
        <h1
          className="text-2xl font-bold flex items-center gap-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <Trophy
            className="w-6 h-6"
            style={{ color: 'var(--color-warning, #f59e0b)' }}
            aria-hidden
          />
          Leaderboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Top recyclers ranked by points
        </p>
      </div>

      {/* Main Content Card — replaces glass-card (Requirement 5.4) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card elevation="md" className="p-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={fetchLeaderboard}
            />
          ) : data && data.entries.length > 0 ? (
            <>
              <LeaderboardTable entries={data.entries} />

              {/* Show current user's rank if not in top 20 */}
              {!currentUserInList && currentUserRank !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 pt-4"
                  style={{ borderTop: '1px solid var(--color-border-default)' }}
                >
                  <div
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                    }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-primary)' }}>
                      Your rank:{' '}
                      <span
                        className="font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        #{currentUserRank}
                      </span>
                    </span>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No leaderboard data yet"
              description="Complete triage sessions to earn points and appear on the leaderboard."
            />
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    // overflow-x-auto ensures horizontal scroll within the Card on narrow viewports
    // without causing the page itself to scroll (Requirement 9.3)
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full min-w-[480px]" role="table">
        <caption className="sr-only">Leaderboard — top recyclers ranked by points</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
            <th
              className="text-left text-xs font-medium uppercase tracking-wide py-3 px-3 w-16"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Rank
            </th>
            <th
              className="text-left text-xs font-medium uppercase tracking-wide py-3 px-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Player
            </th>
            <th
              className="text-left text-xs font-medium uppercase tracking-wide py-3 px-3 hidden sm:table-cell"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Level
            </th>
            {/* tabular-nums on the heading keeps column width stable (Requirement 3.5) */}
            <th
              className="text-right text-xs font-medium uppercase tracking-wide py-3 px-3 tabular-nums"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Points
            </th>
            <th
              className="text-right text-xs font-medium uppercase tracking-wide py-3 px-3 hidden sm:table-cell"
              style={{ color: 'var(--color-text-muted)' }}
            >
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
  const rankIcon = RANK_ICONS[entry.rank];

  return (
    <motion.tr
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className="transition-colors"
      style={
        entry.isCurrentUser
          ? {
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              borderLeft: '2px solid var(--color-primary)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }
          : {
              borderBottom: '1px solid var(--color-border-subtle)',
            }
      }
    >
      {/* Rank — SVG icon for top 3, plain text for the rest (Requirement 7.4) */}
      <td className="py-3 px-3">
        {rankIcon ? (
          <span
            role="img"
            aria-label={rankIcon.label}
            className="inline-flex items-center"
          >
            <rankIcon.Icon
              size={22}
              strokeWidth={1.75}
              style={{ color: rankIcon.color }}
              aria-hidden
            />
          </span>
        ) : (
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            #{entry.rank}
          </span>
        )}
      </td>

      {/* Display Name */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{
              color: entry.isCurrentUser
                ? 'var(--color-primary)'
                : 'var(--color-text-primary)',
            }}
          >
            {entry.displayName}
          </span>
          {entry.isCurrentUser && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
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

      {/* Points — tabular-nums for aligned digit columns (Requirement 3.5) */}
      <td className="py-3 px-3 text-right">
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {entry.points.toLocaleString()}
        </span>
      </td>

      {/* Badge Count */}
      <td className="py-3 px-3 text-right hidden sm:table-cell">
        <span
          className="text-sm tabular-nums"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {entry.badgeCount}
        </span>
      </td>
    </motion.tr>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — uses design system Skeleton component (Requirement 8.1)
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading leaderboard…">
      {/* Header row skeleton */}
      <div
        className="flex items-center gap-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border-default)' }}
      >
        <Skeleton variant="text" width={48} height={12} />
        <Skeleton variant="text" width={128} height={12} />
        <Skeleton variant="text" width={80} height={12} className="hidden sm:block" />
        <Skeleton variant="text" width={64} height={12} className="ml-auto" />
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton variant="text" width={32} height={20} />
          <Skeleton variant="text" width={112} height={16} />
          <Skeleton variant="text" width={96} height={20} className="hidden sm:block" />
          <Skeleton variant="text" width={56} height={16} className="ml-auto" />
          <Skeleton variant="text" width={24} height={16} className="hidden sm:block" />
        </div>
      ))}
    </div>
  );
}
