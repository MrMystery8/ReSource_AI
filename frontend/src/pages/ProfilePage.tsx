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

// Level color mapping — uses semantic token-compatible classes
const LEVEL_COLORS: Record<UserLevel, { text: string; bg: string; border: string }> = {
  Recycler: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  'Eco-Sorter': {
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
  },
  'Resource Salvager': {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
  },
  'Triage Specialist': {
    text: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  'E-Waste Champion': {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
  },
  'Green Guardian': {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
  'Eco-Legend': {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

// Progress bar gradient per level
const LEVEL_PROGRESS_GRADIENT: Record<UserLevel, string> = {
  Recycler:          'from-emerald-500 to-emerald-400',
  'Eco-Sorter':      'from-teal-500 to-teal-400',
  'Resource Salvager': 'from-blue-500 to-blue-400',
  'Triage Specialist': 'from-indigo-500 to-indigo-400',
  'E-Waste Champion': 'from-purple-500 to-purple-400',
  'Green Guardian':  'from-amber-500 to-amber-400',
  'Eco-Legend':      'from-rose-500 to-rose-400',
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

  const levelColors = LEVEL_COLORS[currentLevel];
  const progressGradient = LEVEL_PROGRESS_GRADIENT[currentLevel];

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
                {/* Level + Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Level Progression
                    </p>
                    <button
                      onClick={() => setShowLadder(true)}
                      className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Info className="w-3.5 h-3.5" />
                      View Level Ladder
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Current Level Badge */}
                    <div className="shrink-0">
                      <LevelBadge level={currentLevel} size="md" showLabel={true} />
                    </div>

                    {/* Progress Bar Connector */}
                    <div className="flex-1 relative">
                      <div
                        onClick={() => setShowLadder(true)}
                        className="w-full h-4 rounded-full overflow-hidden border cursor-pointer relative group transition-all hover:shadow-md"
                        style={{
                          backgroundColor: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-border-default)',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${progressGradient}`}
                        />
                        {/* Interactive Tooltip Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/5">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-white dark:text-gray-200 drop-shadow-sm">
                            Progress: {progressPercent}% ({stats?.points ?? 0} pts)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Level Badge (Faded out, click to open ladder) */}
                    <div className="shrink-0">
                      {stats?.nextLevel ? (
                        <div 
                          onClick={() => setShowLadder(true)}
                          className="cursor-pointer transition-all hover:scale-105 active:scale-95 group relative"
                        >
                          <div className="opacity-40 group-hover:opacity-85 transition-opacity filter grayscale group-hover:grayscale-0">
                            <LevelBadge level={stats.nextLevel} size="md" showLabel={true} />
                          </div>
                          {/* Floating interactive hint */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bg-gray-900 text-white text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-10 font-medium">
                            {stats.pointsToNextLevel} pts away! Click to view
                          </div>
                        </div>
                      ) : (
                        <div className="opacity-100 scale-100">
                          <LevelBadge level="Eco-Legend" size="md" showLabel={true} />
                        </div>
                      )}
                    </div>
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

      {/* Level Ladder Modal */}
      <AnimatePresence>
        {showLadder && stats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLadder(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
              style={{
                backgroundColor: 'var(--color-surface-card)',
                borderColor: 'var(--color-border-default)',
              }}
            >
              {/* Header */}
              <div 
                className="p-5 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Level Progression Ladder
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    Earn points through triages and project submissions to rank up!
                  </p>
                </div>
                <button
                  onClick={() => setShowLadder(false)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ladder Content (Scrollable list) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Overview banner */}
                <div 
                  className="p-4 rounded-xl border flex items-center justify-between"
                  style={{ 
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border-default)',
                  }}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Your Current Standing
                    </p>
                    <p className="text-xl font-black mt-1" style={{ color: 'var(--color-primary)' }}>
                      {stats.points.toLocaleString()} <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Total Points</span>
                    </p>
                  </div>
                  <LevelBadge level={currentLevel} size="md" />
                </div>

                {/* Vertical Ladder Steps */}
                <div className="relative pl-8 space-y-8">
                  {/* Vertical connecting line */}
                  <div 
                    className="absolute left-4 top-4 bottom-4 w-1 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: 'var(--color-border-default)' }}
                  />

                  {LEVEL_THRESHOLDS.map((threshold, idx) => {
                    const isCurrent = threshold.level === currentLevel;
                    const isPassed = stats.points >= threshold.minPoints && !isCurrent;
                    const isLocked = stats.points < threshold.minPoints;
                    
                    // Determine connection highlight
                    const isNextToEarn = stats.nextLevel === threshold.level;

                    return (
                      <div key={threshold.level} className="relative flex items-start gap-4 group">
                        {/* Timeline Step Indicator Circle */}
                        <div 
                          className={`absolute left-0 top-3 w-8 h-8 rounded-full border-2 flex items-center justify-center -translate-x-1/2 z-10 transition-all ${
                            isCurrent 
                              ? 'text-white shadow-lg ring-4 scale-110'
                              : isPassed
                              ? 'text-white'
                              : 'text-muted'
                          }`}
                          style={{
                            backgroundColor: isCurrent 
                              ? 'var(--color-primary)'
                              : isPassed
                              ? 'var(--color-success)'
                              : 'var(--color-surface-elevated)',
                            borderColor: isCurrent 
                              ? 'var(--color-primary)'
                              : isPassed
                              ? 'var(--color-success)'
                              : 'var(--color-border-default)',
                            color: isCurrent || isPassed ? '#ffffff' : 'var(--color-text-muted)',
                            boxShadow: isCurrent 
                              ? '0 0 12px color-mix(in srgb, var(--color-primary) 50%, transparent)' 
                              : 'none',
                          }}
                        >
                          {isPassed ? (
                            <Check className="w-4 h-4 font-black" />
                          ) : isCurrent ? (
                            <Star className="w-4 h-4 fill-white" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Step Card Content */}
                        <div 
                          className={`flex-1 rounded-xl p-4 border transition-all ${
                            isCurrent 
                              ? 'shadow-md' 
                              : isNextToEarn
                              ? 'border-dashed'
                              : ''
                          }`}
                          style={{
                            backgroundColor: isCurrent 
                              ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface-elevated))'
                              : 'var(--color-surface-elevated)',
                            borderColor: isCurrent 
                              ? 'var(--color-primary)'
                              : 'var(--color-border-default)',
                            boxShadow: isCurrent 
                              ? '0 4px 12px color-mix(in srgb, var(--color-primary) 8%, transparent)'
                              : 'none',
                          }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <LevelBadge level={threshold.level} size="sm" showLabel={true} />
                              {isCurrent && (
                                <span 
                                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" 
                                  style={{ 
                                    color: 'var(--color-primary)', 
                                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' 
                                  }}
                                >
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                              {threshold.minPoints.toLocaleString()}{threshold.maxPoints === Infinity ? '+' : ` - ${threshold.maxPoints.toLocaleString()}`} pts
                            </span>
                          </div>

                          {/* Progress text for current level */}
                          {isCurrent && threshold.maxPoints !== Infinity && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[11px] mb-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                <span>Level Progress</span>
                                <span>{stats.points.toLocaleString()} / {threshold.maxPoints.toLocaleString()} pts</span>
                              </div>
                              <div 
                                className="w-full h-1.5 rounded-full overflow-hidden" 
                                style={{ backgroundColor: 'var(--color-border-default)' }}
                              >
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${progressPercent}%`,
                                    backgroundColor: 'var(--color-primary)',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div 
                className="p-5 border-t bg-gray-50/50 dark:bg-gray-950/20 text-center"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                <button
                  onClick={() => setShowLadder(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-105 active:scale-98"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                  }}
                >
                  Got it, close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
