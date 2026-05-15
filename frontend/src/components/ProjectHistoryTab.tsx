import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Trash2,
  ChevronRight,
  Star,
  Zap,
} from 'lucide-react';
import type { ProjectHistoryEntry } from '@resource-ai/shared';

export interface ProjectHistoryTabProps {
  projects: ProjectHistoryEntry[];
  totalCount: number;
  onLoadMore: () => void;
  onNavigate: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  isLoadingMore?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

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

/** Status indicator for a project entry */
function ProjectStatusIndicator({ status }: { status: ProjectHistoryEntry['status'] }) {
  switch (status) {
    case 'in-progress':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    case 'abandoned':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          <XCircle className="w-3 h-3" />
          Abandoned
        </span>
      );
  }
}

/** Grade badge for completed projects */
function GradeBadge({ grade }: { grade: 'A' | 'B' | 'C' | 'D' | 'F' }) {
  const colorMap: Record<string, string> = {
    A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    B: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    C: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    D: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    F: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorMap[grade] ?? colorMap['F']}`}
    >
      <Star className="w-3 h-3" />
      {grade}
    </span>
  );
}

/** Confirmation dialog for abandon / delete actions */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 p-6 w-full max-w-sm rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-lg)]"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-bold text-white mb-2">
          {title}
        </h3>
        <p className="text-text-secondary text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary bg-surface-elevated border border-border-subtle hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ProjectHistoryTab({
  projects,
  totalCount,
  onLoadMore,
  onNavigate,
  onDelete,
  isLoadingMore = false,
  error = null,
  onRetry,
}: ProjectHistoryTabProps) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const hasMore = projects.length < totalCount;

  function handleProjectClick(project: ProjectHistoryEntry) {
    if (project.status === 'abandoned') return;
    onNavigate(project.projectId);
    // Navigate to guide page; completed projects will show read-only view
    navigate(`/guide/${project.projectId}`);
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  }

  // Error state (no projects loaded yet)
  if (error && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="p-8 w-full max-w-md text-center rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)]">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to load projects</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-500 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0 && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center min-h-[40vh]"
      >
        <div className="p-10 w-full max-w-md text-center rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/20 mb-5">
            <Zap className="w-8 h-8 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
          <p className="text-text-secondary text-sm">
            Click an idea card during a triage session to start your first recycling project.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Error banner for load-more errors */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm flex-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-rose-300 underline hover:text-rose-200 transition-colors shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Project cards */}
      <div className="space-y-3">
        {projects.map((project, index) => (
          <motion.div
            key={project.projectId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index < PAGE_SIZE ? index * 0.04 : 0 }}
          >
            <div className="p-4 group rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/30 transition-colors">
              <div className="flex items-center justify-between gap-4">
                {/* Left: project info — clickable for in-progress and completed */}
                <button
                  onClick={() => handleProjectClick(project)}
                  disabled={project.status === 'abandoned'}
                  className="flex-1 min-w-0 text-left disabled:cursor-default"
                  aria-label={
                    project.status === 'abandoned'
                      ? `${project.ideaTitle} — Abandoned`
                      : `Open project: ${project.ideaTitle}`
                  }
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3
                      className={`font-medium truncate ${
                        project.status === 'abandoned'
                          ? 'text-text-muted'
                          : 'text-white group-hover:text-primary-300 transition-colors'
                      }`}
                    >
                      {project.ideaTitle}
                    </h3>
                    {project.status === 'completed' && project.grade && (
                      <GradeBadge grade={project.grade} />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <ProjectStatusIndicator status={project.status} />
                    <span className="inline-flex items-center gap-1 text-text-muted text-xs">
                      <Clock className="w-3 h-3" />
                      {formatDate(project.startedAt)}
                    </span>
                    {project.status === 'completed' && project.pointsEarned !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary-300 font-medium">
                        <Zap className="w-3 h-3" />
                        {project.pointsEarned} pts
                      </span>
                    )}
                  </div>
                </button>

                {/* Right: actions + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Delete button — always available */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(project.projectId);
                    }}
                    aria-label={`Delete project: ${project.ideaTitle}`}
                    title="Delete project"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>

                  {/* Chevron — only for navigable projects */}
                  {project.status !== 'abandoned' && (
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-400 transition-colors" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-surface-elevated/50 border border-border-subtle hover:bg-surface-elevated/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            isOpen={true}
            title="Delete Project?"
            message="This action is permanent and cannot be undone. The project record and all associated data will be removed."
            confirmLabel="Delete Permanently"
            confirmClassName="bg-rose-600 hover:bg-rose-500"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default ProjectHistoryTab;
