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

const LEVEL_COLORS: Record<UserLevel, { text: string; bg: string; border: string; bar: string }> = {
  Recycler: {
    text: 'text-primary-700',
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    bar: 'bg-primary-500',
  },
  Salvager: {
    text: 'text-info-600',
    bg: 'bg-info-50',
    border: 'border-info-100',
    bar: 'bg-info-500',
  },
  'E-Waste Champion': {
    text: 'text-accent-600',
    bg: 'bg-accent-50',
    border: 'border-accent-200',
    bar: 'bg-accent-500',
  },
  'Green Guardian': {
    text: 'text-warning-600',
    bg: 'bg-warning-50',
    border: 'border-warning-100',
    bar: 'bg-warning-500',
  },
};

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
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md border shadow-[0_4px_12px_oklch(0_0_0/0.06)] ${
        type === 'success'
          ? 'bg-success-50 border-success-100 text-success-600'
          : 'bg-danger-50 border-danger-100 text-danger-600'
      }`}
      role="alert"
      aria-live="polite"
    >
      {type === 'success' ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity" aria-label="Dismiss">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function ProfilePage() {
  const { user, token, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      setToast({ message: 'Profile updated', type: 'success' });
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

  const currentLevel = stats?.level ?? 'Recycler';
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel);
  const pointsInLevel = (stats?.points ?? 0) - (currentThreshold?.minPoints ?? 0);
  const levelRange = (currentThreshold?.maxPoints ?? 499) - (currentThreshold?.minPoints ?? 0) + 1;
  const progressPercent = currentThreshold?.maxPoints === Infinity
    ? 100
    : Math.min(100, Math.round((pointsInLevel / levelRange) * 100));

  const earnedBadgeIds = new Set(
    stats?.badges?.filter((b) => b.earnedAt !== null).map((b) => b.id) ?? []
  );
  const earnedBadgesMap = new Map(
    stats?.badges?.filter((b) => b.earnedAt !== null).map((b) => [b.id, b]) ?? []
  );

  const levelColors = LEVEL_COLORS[currentLevel];

  return (
    <>
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage your account and track your progress
          </p>
        </div>

        {/* User Info Card */}
        <section className="card p-6" aria-labelledby="account-heading">
          <h2 id="account-heading" className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-primary-600" />
            Account Information
          </h2>

          <div className="space-y-4">
            {/* Display Name */}
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
                      className="flex-1 px-3 py-2 rounded-md bg-white border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors text-sm"
                    />
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim()}
                      className="p-2 rounded-md bg-success-50 border border-success-100 text-success-600 hover:bg-success-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Save display name"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-success-200 border-t-success-600 rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="p-2 rounded-md bg-stone-100 border border-border-default text-text-secondary hover:text-text-primary hover:bg-stone-200 transition-colors"
                      aria-label="Cancel editing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-text-primary font-medium">{user?.displayName ?? '—'}</p>
                    <button
                      onClick={() => {
                        setEditName(user?.displayName ?? '');
                        setIsEditing(true);
                      }}
                      className="p-1.5 rounded-md text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      aria-label="Edit display name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Email</label>
              <div className="flex items-center gap-2 mt-1.5">
                <Mail className="w-4 h-4 text-text-muted" />
                <p className="text-text-secondary text-sm">{user?.email ?? '—'}</p>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Role</label>
              <div className="flex items-center gap-2 mt-1.5">
                <Shield className="w-4 h-4 text-text-muted" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 border border-primary-200 text-primary-700 capitalize">
                  {user?.role ?? 'user'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Member Since</label>
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
        </section>

        {/* Gamification Stats */}
        <section className="card p-6" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2">
            <Trophy className="w-4.5 h-4.5 text-accent-500" />
            Progress
          </h2>

          {statsLoading ? (
            <div className="space-y-4 animate-pulse" aria-busy="true">
              <div className="h-14 rounded-md bg-stone-100" />
              <div className="h-6 rounded-md bg-stone-100 w-2/3" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-md bg-stone-100" />
                ))}
              </div>
            </div>
          ) : statsError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-text-secondary text-sm">Unable to load stats</p>
              <button
                onClick={fetchStats}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Level + Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium px-2.5 py-1 rounded-full border ${levelColors.bg} ${levelColors.border} ${levelColors.text}`}>
                    {currentLevel}
                  </span>
                  {stats?.nextLevel && (
                    <span className="text-xs text-text-muted">
                      {stats.pointsToNextLevel} pts to {stats.nextLevel}
                    </span>
                  )}
                </div>
                <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full ${levelColors.bar}`}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-stone-50 border border-border-subtle p-4 text-center">
                  <Star className="w-4.5 h-4.5 text-accent-500 mx-auto mb-1.5" />
                  <p className="text-lg font-semibold text-text-primary tabular-nums">
                    {(stats?.points ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">Points</p>
                </div>
                <div className="rounded-md bg-stone-50 border border-border-subtle p-4 text-center">
                  <Flame className="w-4.5 h-4.5 text-accent-400 mx-auto mb-1.5" />
                  <p className="text-lg font-semibold text-text-primary tabular-nums">{stats?.streak ?? 0}</p>
                  <p className="text-xs text-text-muted mt-0.5">Streak</p>
                </div>
                <div className="rounded-md bg-stone-50 border border-border-subtle p-4 text-center">
                  <Trophy className="w-4.5 h-4.5 text-primary-500 mx-auto mb-1.5" />
                  <p className="text-lg font-semibold text-text-primary tabular-nums">{stats?.totalSessions ?? 0}</p>
                  <p className="text-xs text-text-muted mt-0.5">Sessions</p>
                </div>
              </div>

              {/* Badges */}
              <div>
                <h3 className="text-sm font-medium text-text-primary mb-3">Badges</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BADGE_DEFINITIONS.map((badge) => {
                    const isEarned = earnedBadgeIds.has(badge.id);
                    const earnedInfo = earnedBadgesMap.get(badge.id);

                    return (
                      <div
                        key={badge.id}
                        className={`rounded-md p-3.5 border transition-all ${
                          isEarned
                            ? 'bg-white border-border-default shadow-[0_1px_3px_oklch(0_0_0/0.04)]'
                            : 'bg-stone-50 border-border-subtle opacity-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                            isEarned ? 'bg-primary-50' : 'bg-stone-100'
                          }`}>
                            <span className="text-lg" role="img" aria-label={badge.name}>
                              {badge.icon}
                            </span>
                          </div>
                          <p className={`text-xs font-medium ${isEarned ? 'text-text-primary' : 'text-text-muted'}`}>
                            {badge.name}
                          </p>
                          <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                            {badge.description}
                          </p>
                          {isEarned && earnedInfo?.earnedAt && (
                            <p className="text-[11px] text-primary-600 mt-1.5 font-medium">
                              {new Date(earnedInfo.earnedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </motion.div>
    </>
  );
}
