import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { ProjectHistoryTab } from '../components/ProjectHistoryTab';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import type { SessionSummary, ProjectHistoryEntry } from '@resource-ai/shared';

// ---------------------------------------------------------------------------
// ARIA live region announcer — Validates: Requirements 10.9
// ---------------------------------------------------------------------------
function LiveAnnouncer({
  message,
  politeness,
}: {
  message: string;
  politeness: 'polite' | 'assertive';
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const PAGE_SIZE = 10;

type ActiveTab = 'projects' | 'triage';

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
        <span
          className="inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--color-warning)' }}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case 'complete':
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--color-success)' }}
        >
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    case 'failed':
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--color-error)' }}
        >
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
  }
}

// ─── Skeleton for session list ─────────────────────────────────────────────

function TriageSessionsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading sessions…">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} elevation="sm" className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton variant="text" width="45%" height={16} />
                <Skeleton variant="text" width={56} height={20} />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton variant="text" width={80} height={14} />
                <Skeleton variant="text" width={96} height={14} />
              </div>
            </div>
            <Skeleton variant="text" width={64} height={16} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Triage Sessions Tab ───────────────────────────────────────────────────

interface TriageSessionsTabProps {
  token: string | null;
}

function TriageSessionsTab({ token }: TriageSessionsTabProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ARIA live region state — Validates: Requirements 10.9
  const [announcement, setAnnouncement] = useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  } | null>(null);

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

  useEffect(() => {
    setIsLoading(true);
    fetchSessions(0, false).finally(() => setIsLoading(false));
  }, [fetchSessions]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchSessions(sessions.length, true);
    setIsLoadingMore(false);
    // Announce result to screen readers — Validates: Requirements 10.9
    if (error) {
      setAnnouncement({ message: `Failed to load more sessions: ${error}`, politeness: 'assertive' });
    } else {
      setAnnouncement({ message: 'More sessions loaded.', politeness: 'polite' });
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchSessions(0, false).finally(() => setIsLoading(false));
  };

  if (isLoading) {
    return <TriageSessionsSkeleton />;
  }

  if (error && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <ErrorState
          message={error}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (sessions.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <EmptyState
          icon={Inbox}
          title="No sessions yet"
          description="Start your first e-waste triage to see your history here."
          ctaLabel="Start your first triage"
          onCta={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ARIA live region for load-more announcements — Validates: Requirements 10.9 */}
      {announcement && (
        <LiveAnnouncer
          message={announcement.message}
          politeness={announcement.politeness}
        />
      )}

      {/* Error banner (for load-more errors) */}
      {error && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center gap-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
          }}
        >
          <AlertTriangle
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--color-error)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
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
              className="block group"
              style={{ textDecoration: 'none' }}
            >
              <Card
                elevation="sm"
                className="p-4 transition-colors hover:border-[var(--color-border-default)]"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: device info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3
                        className="font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
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
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          Salvage:{' '}
                          <span
                            className="font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {session.salvageScore}/5
                          </span>
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <Clock className="w-3 h-3" />
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right: status + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusIndicator status={session.status} />
                    <ChevronRight
                      className="w-4 h-4 transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                  </div>
                </div>
              </Card>
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
            className="px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-subtle)',
            }}
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

// ─── Skeleton for projects list ────────────────────────────────────────────

function ProjectsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading projects…">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} elevation="sm" className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton variant="text" width="55%" height={16} />
                <Skeleton variant="text" width={48} height={20} />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton variant="text" width={72} height={14} />
                <Skeleton variant="text" width={88} height={14} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="circular" width={28} height={28} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────

interface ProjectsTabContainerProps {
  token: string | null;
}

function ProjectsTabContainer({ token }: ProjectsTabContainerProps) {
  const [projects, setProjects] = useState<ProjectHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ARIA live region state — Validates: Requirements 10.9
  const [announcement, setAnnouncement] = useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  } | null>(null);

  const fetchProjects = useCallback(
    async (offset: number, append: boolean) => {
      if (!token) return;
      const client = new ApiClient(API_URL, API_KEY, () => token);
      try {
        const data = await client.getProjects(PAGE_SIZE, offset);
        if (append) {
          setProjects((prev) => [...prev, ...data.projects]);
        } else {
          setProjects(data.projects);
        }
        setTotal(data.total);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load projects';
        setError(message);
      }
    },
    [token]
  );

  useEffect(() => {
    setIsLoading(true);
    fetchProjects(0, false).finally(() => setIsLoading(false));
  }, [fetchProjects]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchProjects(projects.length, true);
    setIsLoadingMore(false);
    // Announce result to screen readers — Validates: Requirements 10.9
    if (error) {
      setAnnouncement({ message: `Failed to load more projects: ${error}`, politeness: 'assertive' });
    } else {
      setAnnouncement({ message: 'More projects loaded.', politeness: 'polite' });
    }
  };

  const handleAbandon = async (projectId: string) => {
    if (!token) return;
    const client = new ApiClient(API_URL, API_KEY, () => token);
    try {
      await client.updateProject(projectId, 'abandon');
      setProjects((prev) =>
        prev.map((p) =>
          p.projectId === projectId ? { ...p, status: 'abandoned' as const } : p
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to abandon project';
      setError(message);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!token) return;
    const client = new ApiClient(API_URL, API_KEY, () => token);
    try {
      await client.updateProject(projectId, 'delete');
      setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      setError(message);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchProjects(0, false).finally(() => setIsLoading(false));
  };

  if (isLoading) {
    return <ProjectsSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ARIA live region for load-more announcements — Validates: Requirements 10.9 */}
      {announcement && (
        <LiveAnnouncer
          message={announcement.message}
          politeness={announcement.politeness}
        />
      )}
      <ProjectHistoryTab
        projects={projects}
        totalCount={total}
        onLoadMore={handleLoadMore}
        onNavigate={() => {
          // Navigation is handled inside ProjectHistoryTab via useNavigate
        }}
        onAbandon={handleAbandon}
        onDelete={handleDelete}
        isLoadingMore={isLoadingMore}
        error={error}
        onRetry={handleRetry}
      />
    </motion.div>
  );
}

// ─── HistoryPage ──────────────────────────────────────────────────────────

export function HistoryPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderOpen className="w-4 h-4" />,
    },
    {
      id: 'triage',
      label: 'Triage Sessions',
      icon: <ClipboardList className="w-4 h-4" />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          History
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Track your recycling projects and triage sessions
        </p>
      </div>

      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label="History sections"
        className="flex gap-1 p-1 rounded-xl mb-6"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={
              activeTab === tab.id
                ? {
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    boxShadow: 'var(--shadow-sm)',
                  }
                : {
                    color: 'var(--color-text-secondary)',
                  }
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        id="tabpanel-projects"
        role="tabpanel"
        aria-labelledby="tab-projects"
        hidden={activeTab !== 'projects'}
      >
        <ProjectsTabContainer token={token} />
      </div>
      <div
        id="tabpanel-triage"
        role="tabpanel"
        aria-labelledby="tab-triage"
        hidden={activeTab !== 'triage'}
      >
        <TriageSessionsTab token={token} />
      </div>
    </motion.div>
  );
}
