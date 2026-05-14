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
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { ProjectHistoryTab } from '../components/ProjectHistoryTab';
import type { SessionSummary, ProjectHistoryEntry } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const PAGE_SIZE = 10;

type ActiveTab = 'projects' | 'triage';

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

function getRiskBadgeClasses(riskLevel: string | null): string {
  switch (riskLevel) {
    case 'Green':
      return 'bg-success-50 text-success-600 border-success-100';
    case 'Yellow':
      return 'bg-warning-50 text-warning-600 border-warning-100';
    case 'Orange':
      return 'bg-accent-50 text-accent-600 border-accent-200';
    case 'Red':
      return 'bg-danger-50 text-danger-600 border-danger-100';
    default:
      return 'bg-stone-100 text-text-secondary border-border-subtle';
  }
}

function StatusIndicator({ status }: { status: SessionSummary['status'] }) {
  switch (status) {
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-warning-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case 'complete':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-success-600">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-danger-500">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
  }
}

// ─── Triage Sessions Tab ───

function TriageSessionsTab({ token }: { token: string | null }) {
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
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          <p className="text-text-secondary text-sm">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="card p-8 w-full max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-warning-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary mb-1">Unable to load history</h2>
          <p className="text-text-secondary text-sm mb-5">{error}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              setError(null);
              fetchSessions(0, false).finally(() => setIsLoading(false));
            }}
            className="px-4 py-2 rounded-md font-medium text-text-primary bg-primary-600 hover:bg-primary-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (sessions.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="card p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <Inbox className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No sessions yet</h2>
          <p className="text-text-secondary text-sm mb-5">
            Start your first e-waste triage to see your history here.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-text-primary bg-primary-600 hover:bg-primary-700 transition-colors text-sm"
          >
            <Recycle className="w-4 h-4" />
            Start your first triage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-danger-50 border border-danger-100 flex items-center gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 text-danger-500 shrink-0" />
          <p className="text-danger-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map((session, index) => (
          <motion.div
            key={session.sessionId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index < PAGE_SIZE ? index * 0.03 : 0 }}
          >
            <Link
              to={`/history/${session.sessionId}`}
              className="block card card-hover p-4 transition-all group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {session.deviceName || 'Unknown Device'}
                    </h3>
                    {session.riskLevel && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${getRiskBadgeClasses(session.riskLevel)}`}>
                        {session.riskLevel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {session.salvageScore !== null && (
                      <span className="text-text-secondary">
                        Salvage: <span className="text-text-primary font-medium">{session.salvageScore}%</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusIndicator status={session.status} />
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-5 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-5 py-2 rounded-md font-medium text-text-primary bg-stone-100 border border-border-default hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 text-sm"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Projects Tab ───

function ProjectsTabContainer({ token }: { token: string | null }) {
  const [projects, setProjects] = useState<ProjectHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : 'Failed to load projects');
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
  };

  const handleAbandon = async (projectId: string) => {
    if (!token) return;
    const client = new ApiClient(API_URL, API_KEY, () => token);
    try {
      await client.updateProject(projectId, 'abandon');
      setProjects((prev) =>
        prev.map((p) => (p.projectId === projectId ? { ...p, status: 'abandoned' as const } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abandon project');
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
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchProjects(0, false).finally(() => setIsLoading(false));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          <p className="text-text-secondary text-sm">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectHistoryTab
      projects={projects}
      totalCount={total}
      onLoadMore={handleLoadMore}
      onNavigate={() => {}}
      onAbandon={handleAbandon}
      onDelete={handleDelete}
      isLoadingMore={isLoadingMore}
      error={error}
      onRetry={handleRetry}
    />
  );
}

// ─── HistoryPage ───

export function HistoryPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'projects', label: 'Projects', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'triage', label: 'Triage Sessions', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">History</h1>
        <p className="text-text-secondary text-sm mt-1">
          Track your recycling projects and triage sessions
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-md bg-stone-100 border border-border-subtle mb-6" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-white text-text-primary shadow-[0_1px_3px_oklch(0_0_0/0.04)] border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'projects' ? (
        <ProjectsTabContainer token={token} />
      ) : (
        <TriageSessionsTab token={token} />
      )}
    </motion.div>
  );
}
