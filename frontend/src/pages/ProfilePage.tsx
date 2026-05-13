import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Pencil,
  Check,
  X,
  Flame,
  Star,
  Trophy,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '@resource-ai/shared';
import type { UserStatsResponse, UserLevel } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// Level color mapping
const LEVEL_COLORS: Record<UserLevel, { text: string; bg: string; border: string; glow: string }> = {
  Recycler: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  Salvager: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
  },
  'E-Waste Champion': {
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
  },
  'Green Guardian': {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
  },
};

// Toast component
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-xl ${
        type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

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
        className="max-w-4xl mx-auto px-4 py-8 space-y-6"
      >
        {/* Page Title */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage your account and track your progress
          </p>
        </div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Account Information
          </h2>

          <div className="space-y-4">
            {/* Display Name (editable) */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Display Name
                </label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={100}
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated/50 border border-border-subtle text-white placeholder-text-muted focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 transition-colors text-sm"
                    />
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim()}
                      className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Save display name"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-400" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Cancel editing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-white font-medium">{user?.displayName ?? '—'}</p>
                    <button
                      onClick={() => {
                        setEditName(user?.displayName ?? '');
                        setIsEditing(true);
                      }}
                      className="p-1.5 rounded-md text-text-muted hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
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
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Email
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <Mail className="w-4 h-4 text-text-muted" />
                <p className="text-text-secondary text-sm">{user?.email ?? '—'}</p>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Role
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <Shield className="w-4 h-4 text-text-muted" />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/10 border border-primary-500/30 text-primary-300 capitalize">
                  {user?.role ?? 'user'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Member Since
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <Calendar className="w-4 h-4 text-text-muted" />
                <p className="text-text-secondary text-sm">
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
        </motion.div>

        {/* Gamification Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Gamification Stats
          </h2>

          {statsLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 rounded-lg bg-white/5" />
              <div className="h-8 rounded-lg bg-white/5 w-2/3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-white/5" />
                ))}
              </div>
            </div>
          ) : statsError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary text-sm">
                Unable to load gamification stats.
              </p>
              <p className="text-text-muted text-xs mt-1">
                Stats will appear here once the service is available.
              </p>
              <button
                onClick={fetchStats}
                className="mt-4 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Level + Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-full ${levelColors.bg} border ${levelColors.border} ${levelColors.text} shadow-md ${levelColors.glow}`}
                    >
                      {currentLevel}
                    </span>
                  </div>
                  {stats?.nextLevel && (
                    <span className="text-xs text-text-muted">
                      {stats.pointsToNextLevel} pts to {stats.nextLevel}
                    </span>
                  )}
                </div>
                <div className="w-full h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      currentLevel === 'Recycler'
                        ? 'from-emerald-500 to-emerald-400'
                        : currentLevel === 'Salvager'
                          ? 'from-blue-500 to-blue-400'
                          : currentLevel === 'E-Waste Champion'
                            ? 'from-purple-500 to-purple-400'
                            : 'from-amber-500 to-amber-400'
                    }`}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Points */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                  <Star className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-white">
                    {(stats?.points ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">Total Points</p>
                </div>

                {/* Streak */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                  <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-white">{stats?.streak ?? 0}</p>
                  <p className="text-xs text-text-muted mt-0.5">Week Streak</p>
                </div>

                {/* Sessions */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center col-span-2 sm:col-span-1">
                  <Trophy className="w-5 h-5 text-primary-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-white">
                    {stats?.totalSessions ?? 0}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">Sessions</p>
                </div>
              </div>

              {/* Badges Grid */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Badges</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BADGE_DEFINITIONS.map((badge) => {
                    const isEarned = earnedBadgeIds.has(badge.id);
                    const earnedInfo = earnedBadgesMap.get(badge.id);

                    return (
                      <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.02 }}
                        className={`rounded-xl p-4 border transition-all ${
                          isEarned
                            ? 'bg-white/5 border-white/15 shadow-md'
                            : 'bg-white/[0.02] border-white/5 opacity-40 grayscale'
                        }`}
                      >
                        <div className="text-center">
                          <span className="text-2xl block mb-2" role="img" aria-label={badge.name}>
                            {badge.icon}
                          </span>
                          <p
                            className={`text-xs font-semibold ${
                              isEarned ? 'text-white' : 'text-text-muted'
                            }`}
                          >
                            {badge.name}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                            {badge.description}
                          </p>
                          {isEarned && earnedInfo?.earnedAt && (
                            <p className="text-[10px] text-primary-400 mt-1.5">
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
        </motion.div>
      </motion.div>
    </>
  );
}
