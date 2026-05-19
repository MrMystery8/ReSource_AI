import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Pencil,
  Check,
  X,
  Flame,
  Star,
  Trophy,
  AlertCircle,
  CheckCircle,
  Leaf,
  Recycle,
  TriangleAlert,
  Wrench,
  Zap,
  Sprout,
  Megaphone,
  Sparkles,
  MessageCircle,
  Landmark,
  Handshake,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Hammer,
  Award,
  Compass,
  Crown,
  Magnet,
  MessagesSquare,
  Lock,
  Info,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '@resource-ai/shared';
import type { UserStatsResponse, UserLevel } from '@resource-ai/shared';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { LevelBadge } from '../components/gamification/LevelBadge';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Badge icon mapping — replaces emoji icons with Lucide SVG icons
// Maps badge.id → Lucide icon component
// Validates: Requirements 7.4
// ---------------------------------------------------------------------------
const BADGE_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  'first-triage':      Leaf,
  'regular-recycler':  Recycle,
  'hazard-spotter':    TriangleAlert,
  'parts-hunter':      Wrench,
  'streak-master':     Zap,
  'green-champion':    Sprout,
  'community-starter': Megaphone,
  'popular-creator':   Sparkles,
  'conversation-spark': MessageCircle,
  'community-pillar':  Landmark,
  'helpful-neighbor':  Handshake,
  // New Triage & Safety Badges
  'safety-sentinel':   ShieldAlert,
  'triage-titan':      TrendingUp,
  'hazard-hero':       AlertTriangle,
  // New Project Craftsmanship Badges
  'first-project':     Hammer,
  'grade-a-artisan':   Award,
  'recycling-architect': Compass,
  'master-craftsman':  Crown,
  // New Community Engagement Badges
  'upvote-magnet':     Magnet,
  'active-discussant':  MessagesSquare,
};

// Unified accent color per level — used via color-mix() inline styles
// to derive backgrounds, borders, and text in a design-system-consistent way.
const LEVEL_ACCENT: Record<UserLevel, string> = {
  Recycler:            '#10b981',
  'Eco-Sorter':        '#14b8a6',
  'Resource Salvager': '#3b82f6',
  'Triage Specialist': '#6366f1',
  'E-Waste Champion':  '#a855f7',
  'Green Guardian':    '#f59e0b',
  'Eco-Legend':        '#ef4444',
};

// ---------------------------------------------------------------------------
// Toast component — uses semantic tokens instead of raw emerald/rose classes
// Validates: Requirements 7.4, 11.4
// ---------------------------------------------------------------------------
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      role="status"
      aria-live={isSuccess ? 'polite' : 'assertive'}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg"
      style={{
        backgroundColor: isSuccess
          ? 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface-card))'
          : 'color-mix(in srgb, var(--color-error) 10%, var(--color-surface-card))',
        borderColor: isSuccess
          ? 'color-mix(in srgb, var(--color-success) 30%, transparent)'
          : 'color-mix(in srgb, var(--color-error) 30%, transparent)',
        color: isSuccess ? 'var(--color-success)' : 'var(--color-error)',
      }}
    >
      {isSuccess ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </span>
      <button
        onClick={onClose}
        className="ml-2 transition-opacity hover:opacity-70"
        aria-label="Dismiss notification"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------
export function ProfilePage() {
  const { user, token, updateProfile } = useAuth();

  // Display name editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Gamification stats
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Ladder Modal State
  const [showLadder, setShowLadder] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showLadder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showLadder]);

  // Fetch gamification stats
  const fetchStats = useCallback(async () => {
    if (!token) return;

    setStatsLoading(true);
    setStatsError(false);

    try {
      const client = new ApiClient(API_URL, API_KEY, () => token);
      const data = await client.getStats();
      setStats(data);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle save display name
  const handleSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.displayName) {
      setIsEditing(false);
      setEditName(user?.displayName ?? '');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(trimmed);
      setIsEditing(false);
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setToast({ message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(user?.displayName ?? '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  // Calculate progress bar values
  const currentLevel = stats?.level ?? 'Recycler';
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel);
  const pointsInLevel = (stats?.points ?? 0) - (currentThreshold?.minPoints ?? 0);
  const levelRange = (currentThreshold?.maxPoints ?? 499) - (currentThreshold?.minPoints ?? 0) + 1;
  const progressPercent = currentThreshold?.maxPoints === Infinity
    ? 100
    : Math.min(100, Math.round((pointsInLevel / levelRange) * 100));

  // Map earned badges
  const earnedBadgeIds = new Set(
    stats?.badges?.filter((b) => b.earnedAt !== null).map((b) => b.id) ?? []
  );
  const earnedBadgesMap = new Map(
    stats?.badges?.filter((b) => b.earnedAt !== null).map((b) => [b.id, b]) ?? []
  );

  const accent = LEVEL_ACCENT[currentLevel];

  return (
    <>
      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto pb-8 space-y-6"
      >
        {/* Page Title */}
        <div className="mb-2">
          <h1
            className="text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <User className="w-6 h-6" style={{ color: 'var(--color-primary)' }} aria-hidden />
            Profile
          </h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Manage your account and track your progress
          </p>
        </div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card elevation="md" className="p-6">
            <h2
              className="text-lg font-semibold mb-5 flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Account Information
            </h2>

            <div className="space-y-4">
              {/* Display Name (editable) */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--color-text-muted)' }}
                    id="display-name-label"
                  >
                    Display Name
                  </p>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        id="display-name-input"
                        type="text"
                        aria-labelledby="display-name-label"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={100}
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          backgroundColor: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border-default)',
                          color: 'var(--color-text-primary)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border-default)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !editName.trim()}
                        className="p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
                          color: 'var(--color-success)',
                        }}
                        aria-label="Save display name"
                      >
                        {isSaving ? (
                          <div
                            className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2"
                            style={{ borderColor: 'var(--color-success)' }}
                          />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="p-2 rounded-lg border transition-colors"
                        style={{
                          backgroundColor: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-border-default)',
                          color: 'var(--color-text-secondary)',
                        }}
                        aria-label="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <p
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {user?.displayName ?? '—'}
                      </p>
                      <button
                        onClick={() => {
                          setEditName(user?.displayName ?? '');
                          setIsEditing(true);
                        }}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-primary)';
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-text-muted)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        aria-label="Edit display name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Email
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Mail className="w-4 h-4" aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {user?.email ?? '—'}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Member Since
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Calendar className="w-4 h-4" aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Statistics Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card elevation="md" className="p-6">
            <h2
              className="text-lg font-semibold mb-5 flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Trophy className="w-5 h-5 text-amber-500" />
              Statistics
            </h2>

            {statsLoading ? (
              /* Skeleton loading state — Validates: Requirements 8.1 */
              <div className="space-y-4">
                {/* Level + progress bar skeleton */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton variant="text" width={100} height={28} />
                    <Skeleton variant="text" width={120} height={16} />
                  </div>
                  <Skeleton variant="rectangular" height={12} />
                </div>
                {/* Stats grid skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} />
                  ))}
                </div>
                {/* Badges skeleton */}
                <div className="space-y-3">
                  <Skeleton variant="text" width={60} height={20} />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} variant="rectangular" height={100} />
                    ))}
                  </div>
                </div>
              </div>
            ) : statsError ? (
              <div className="text-center py-8">
                <AlertCircle
                  className="w-10 h-10 mx-auto mb-3"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Unable to load gamification stats.
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Stats will appear here once the service is available.
                </p>
                <button
                  onClick={fetchStats}
                  className="mt-4 text-sm transition-colors"
                  style={{ color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Level Progression */}
                <div
                  className="rounded-xl p-5 border cursor-pointer group transition-shadow hover:shadow-md"
                  onClick={() => setShowLadder(true)}
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border-default)',
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Level Progression
                    </p>
                    <span
                      className="text-xs font-medium flex items-center gap-1 transition-colors group-hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Info className="w-3 h-3" />
                      View Ladder
                    </span>
                  </div>

                  {/* Badge → Progress → Badge row */}
                  <div className="flex items-center gap-3">
                    {/* Current Level Badge */}
                    <LevelBadge level={currentLevel} size="sm" showLabel={true} />

                    {/* Progress Bar */}
                    <div className="flex-1">
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--color-surface-card))` }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: accent }}
                        />
                      </div>
                    </div>

                    {/* Next Level Badge (faded) */}
                    {stats?.nextLevel ? (
                      <div className="opacity-30 group-hover:opacity-60 transition-opacity">
                        <LevelBadge level={stats.nextLevel} size="sm" showLabel={true} />
                      </div>
                    ) : (
                      <LevelBadge level="Eco-Legend" size="sm" showLabel={true} />
                    )}
                  </div>

                  {/* Points text */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs tabular-nums font-medium" style={{ color: accent }}>
                      {(stats?.points ?? 0).toLocaleString()} pts
                    </span>
                    {stats?.nextLevel && (
                      <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                        {stats.pointsToNextLevel.toLocaleString()} pts to {stats.nextLevel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats Grid — tabular-nums for numerical values */}
                {/* Validates: Requirements 3.5 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Points */}
                  <div
                    className="rounded-xl p-4 text-center border"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border-default)',
                    }}
                  >
                    <Star className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {(stats?.points ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      Total Points
                    </p>
                  </div>

                  {/* Streak */}
                  <div
                    className="rounded-xl p-4 text-center border"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border-default)',
                    }}
                  >
                    <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1.5" />
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {stats?.streak ?? 0}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      Week Streak
                    </p>
                  </div>

                  {/* Sessions */}
                  <div
                    className="rounded-xl p-4 text-center border col-span-2 sm:col-span-1"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border-default)',
                    }}
                  >
                    <Trophy
                      className="w-5 h-5 mx-auto mb-1.5"
                      style={{ color: 'var(--color-primary)' }}
                    />
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {stats?.totalSessions ?? 0}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      Sessions
                    </p>
                  </div>
                </div>

                {/* Badges Grid — Lucide SVG icons replace emoji */}
                {/* Validates: Requirements 7.4 */}
                <div>
                  <h3
                    className="text-sm font-semibold mb-3"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Badges
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BADGE_DEFINITIONS.map((badge) => {
                      const isEarned = earnedBadgeIds.has(badge.id);
                      const earnedInfo = earnedBadgesMap.get(badge.id);
                      const BadgeIcon = BADGE_ICON_MAP[badge.id] ?? Star;

                      return (
                        <motion.div
                          key={badge.id}
                          whileHover={{ scale: 1.02 }}
                          className="rounded-xl p-4 border transition-all"
                          style={{
                            backgroundColor: isEarned
                              ? 'var(--color-surface-elevated)'
                              : 'var(--color-surface-card)',
                            borderColor: isEarned
                              ? 'var(--color-border-default)'
                              : 'var(--color-border-subtle)',
                            opacity: isEarned ? 1 : 0.45,
                            filter: isEarned ? 'none' : 'grayscale(1)',
                          }}
                        >
                          <div className="text-center">
                            <div className="flex justify-center mb-2">
                              <BadgeIcon
                                className="w-6 h-6"
                                aria-hidden="true"
                                style={{
                                  color: isEarned
                                    ? 'var(--color-primary)'
                                    : 'var(--color-text-muted)',
                                }}
                              />
                            </div>
                            <p
                              className="text-xs font-semibold"
                              style={{
                                color: isEarned
                                  ? 'var(--color-text-primary)'
                                  : 'var(--color-text-muted)',
                              }}
                            >
                              {badge.name}
                            </p>
                            <p
                              className="text-[10px] mt-0.5 leading-tight"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {badge.description}
                            </p>
                            {isEarned && earnedInfo?.earnedAt && (
                              <p
                                className="text-[10px] mt-1.5 tabular-nums"
                                style={{ color: 'var(--color-primary)' }}
                              >
                                {new Date(earnedInfo.earnedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Level Progression Modal */}
      <AnimatePresence>
        {showLadder && stats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLadder(false)}
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-2xl rounded-xl border overflow-hidden max-h-[90vh] flex flex-col z-10"
              style={{
                backgroundColor: 'var(--color-surface-card)',
                borderColor: 'var(--color-border-default)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Trophy className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    Level Progression
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    Earn points through triages, projects, and community engagement.
                  </p>
                </div>
                <button
                  onClick={() => setShowLadder(false)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* Summary banner */}
                <div
                  className="rounded-lg p-4 border mb-5 flex items-center justify-between"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accent} 4%, var(--color-surface-elevated))`,
                    borderColor: `color-mix(in srgb, ${accent} 18%, var(--color-border-default))`,
                  }}
                >
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Current Standing</p>
                    <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      {stats.points.toLocaleString()}
                      <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-secondary)' }}>points</span>
                    </p>
                  </div>
                  <LevelBadge level={currentLevel} size="md" />
                </div>

                {/* Horizontal progress track */}
                <div className="mb-5">
                  {/* Track background */}
                  <div className="flex items-center gap-0.5">
                    {LEVEL_THRESHOLDS.map((threshold, idx) => {
                      const stepAccent = LEVEL_ACCENT[threshold.level];
                      const isCurrent = threshold.level === currentLevel;
                      const isPassed = stats.points >= threshold.minPoints && !isCurrent;

                      // Calculate segment fill for current level
                      let segmentFill = 0;
                      if (isPassed) segmentFill = 100;
                      else if (isCurrent && threshold.maxPoints !== Infinity) {
                        const range = threshold.maxPoints - threshold.minPoints + 1;
                        const inLevel = stats.points - threshold.minPoints;
                        segmentFill = Math.min(100, Math.max(0, Math.round((inLevel / range) * 100)));
                      } else if (isCurrent && threshold.maxPoints === Infinity) {
                        segmentFill = 100;
                      }

                      return (
                        <div key={threshold.level} className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `color-mix(in srgb, ${stepAccent} 12%, var(--color-surface-card))` }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${segmentFill}%`, backgroundColor: stepAccent }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Level cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEVEL_THRESHOLDS.map((threshold, idx) => {
                    const isCurrent = threshold.level === currentLevel;
                    const isPassed = stats.points >= threshold.minPoints && !isCurrent;
                    const isLocked = !isPassed && !isCurrent;
                    const stepAccent = LEVEL_ACCENT[threshold.level];

                    // Per-card progress for current level
                    let cardProgress = 0;
                    if (isCurrent && threshold.maxPoints !== Infinity) {
                      const range = threshold.maxPoints - threshold.minPoints + 1;
                      const inLevel = stats.points - threshold.minPoints;
                      cardProgress = Math.min(100, Math.max(0, Math.round((inLevel / range) * 100)));
                    } else if (isCurrent && threshold.maxPoints === Infinity) {
                      cardProgress = 100;
                    }

                    return (
                      <div
                        key={threshold.level}
                        className="rounded-lg p-3.5 border transition-all"
                        style={{
                          backgroundColor: isCurrent
                            ? `color-mix(in srgb, ${stepAccent} 5%, var(--color-surface-elevated))`
                            : 'var(--color-surface-elevated)',
                          borderColor: isCurrent
                            ? `color-mix(in srgb, ${stepAccent} 30%, var(--color-border-default))`
                            : 'var(--color-border-subtle)',
                          opacity: isLocked ? 0.5 : 1,
                        }}
                      >
                        {/* Top row: status indicator + level name + points range */}
                        <div className="flex items-center gap-2.5">
                          {/* Status circle */}
                          <div
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: isPassed
                                ? 'var(--color-success)'
                                : isCurrent
                                ? stepAccent
                                : 'var(--color-surface-card)',
                              borderColor: isPassed
                                ? 'var(--color-success)'
                                : isCurrent
                                ? stepAccent
                                : 'var(--color-border-default)',
                            }}
                          >
                            {isPassed ? (
                              <Check className="w-3.5 h-3.5" style={{ color: '#fff' }} />
                            ) : isCurrent ? (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            ) : (
                              <Lock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold truncate" style={{ color: isCurrent ? stepAccent : 'var(--color-text-primary)' }}>
                                {threshold.level}
                              </span>
                              {isCurrent && (
                                <span
                                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded shrink-0"
                                  style={{
                                    color: stepAccent,
                                    backgroundColor: `color-mix(in srgb, ${stepAccent} 12%, transparent)`,
                                  }}
                                >
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                              {threshold.minPoints.toLocaleString()}{threshold.maxPoints === Infinity ? '+' : `\u2013${threshold.maxPoints.toLocaleString()}`} pts
                            </span>
                          </div>
                        </div>

                        {/* Progress bar for current level */}
                        {isCurrent && threshold.maxPoints !== Infinity && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                              <span>{cardProgress}% complete</span>
                              <span className="tabular-nums">{stats.points.toLocaleString()} / {threshold.maxPoints.toLocaleString()}</span>
                            </div>
                            <div
                              className="w-full h-1.5 rounded-full overflow-hidden"
                              style={{ backgroundColor: `color-mix(in srgb, ${stepAccent} 12%, var(--color-surface-card))` }}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cardProgress}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: stepAccent }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Completed date for passed levels */}
                        {isPassed && (
                          <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                            <Check className="w-3 h-3" />
                            Completed
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Earned badges count */}
                <div
                  className="mt-5 rounded-lg p-3 border flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border-subtle)',
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Badges Earned
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                    {earnedBadgeIds.size} / {BADGE_DEFINITIONS.length}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-3.5 border-t text-right"
                style={{
                  borderColor: 'var(--color-border-default)',
                  backgroundColor: 'var(--color-surface-elevated)',
                }}
              >
                <button
                  onClick={() => setShowLadder(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
