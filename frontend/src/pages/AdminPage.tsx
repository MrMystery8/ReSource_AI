import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Monitor,
  ChevronDown,
  AlertCircle,
  Loader2,
  Search,
  Shield,
  Calendar,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type {
  UserProfile,
  UserRole,
  UsersListResponse,
  SessionsListResponse,
} from '@resource-ai/shared';

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

type Tab = 'users' | 'sessions';

// ─── Risk Level Badge ───

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span style={{ color: 'var(--color-text-muted)' }} className="text-sm">—</span>;

  const styles: Record<string, React.CSSProperties> = {
    Green: {
      backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
      color: 'var(--color-success)',
      borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
    },
    Yellow: {
      backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
      color: 'var(--color-warning)',
      borderColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
    },
    Orange: {
      backgroundColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
      color: 'var(--color-warning)',
      borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
    },
    Red: {
      backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
      color: 'var(--color-error)',
      borderColor: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
    },
  };

  const fallbackStyle: React.CSSProperties = {
    backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
    color: 'var(--color-text-muted)',
    borderColor: 'color-mix(in srgb, var(--color-text-muted) 30%, transparent)',
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={styles[level] ?? fallbackStyle}
    >
      {level}
    </span>
  );
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    complete: {
      backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
      color: 'var(--color-success)',
      borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
    },
    processing: {
      backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
      color: 'var(--color-primary)',
      borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
    },
    failed: {
      backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
      color: 'var(--color-error)',
      borderColor: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
    },
  };

  const fallbackStyle: React.CSSProperties = {
    backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
    color: 'var(--color-text-muted)',
    borderColor: 'color-mix(in srgb, var(--color-text-muted) 30%, transparent)',
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={styles[status] ?? fallbackStyle}
    >
      {status}
    </span>
  );
}

// ─── Confirmation Dialog ───

function ConfirmDialog({
  isOpen,
  userName,
  newRole,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  userName: string;
  newRole: UserRole;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap — Validates: Requirements 10.10
  useFocusTrap(dialogRef, isOpen);

  // Move focus to first focusable element when dialog opens — Validates: Requirements 10.10
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-dialog-title"
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm mx-4"
      >
        <Card elevation="lg" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
              }}
            >
              <Shield className="w-5 h-5" aria-hidden="true" style={{ color: 'var(--color-warning)' }} />
            </div>
            <h3
              id="admin-confirm-dialog-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Confirm Role Change
            </h3>
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Are you sure you want to change{' '}
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {userName}
            </span>
            &apos;s role to{' '}
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
              {newRole}
            </span>
            ?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isLoading}
              isLoading={isLoading}
            >
              Confirm
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Users Tab ───

function UsersTab({ apiClient }: { apiClient: ApiClient }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    userId: string;
    userName: string;
    newRole: UserRole;
  } | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // ARIA live region state — Validates: Requirements 10.9
  const [announcement, setAnnouncement] = useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  } | null>(null);

  // Ref to the select that triggered the dialog, for focus return — Validates: Requirements 10.10
  const triggerRef = useRef<HTMLSelectElement | null>(null);

  const fetchUsers = useCallback(
    async (currentOffset: number) => {
      setIsLoading(true);
      setError('');
      try {
        const response: UsersListResponse = await apiClient.getAdminUsers(
          PAGE_SIZE,
          currentOffset
        );
        setUsers(response.users);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient]
  );

  useEffect(() => {
    fetchUsers(offset);
  }, [fetchUsers, offset]);

  const handleRoleChange = (user: UserProfile, newRole: UserRole, selectEl: HTMLSelectElement) => {
    if (newRole === user.role) return;
    triggerRef.current = selectEl;
    setConfirmDialog({
      userId: user.userId,
      userName: user.displayName,
      newRole,
    });
  };

  const confirmRoleChange = async () => {
    if (!confirmDialog) return;
    setIsUpdatingRole(true);
    try {
      await apiClient.updateUserRole(confirmDialog.userId, confirmDialog.newRole);
      // Refresh the list
      await fetchUsers(offset);
      setConfirmDialog(null);
      // Announce success — Validates: Requirements 10.9
      setAnnouncement({
        message: `Role updated: ${confirmDialog.userName} is now ${confirmDialog.newRole}.`,
        politeness: 'polite',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      setError(msg);
      setConfirmDialog(null);
      // Announce error — Validates: Requirements 10.9
      setAnnouncement({ message: `Role update failed: ${msg}`, politeness: 'assertive' });
    } finally {
      setIsUpdatingRole(false);
      // Return focus to the trigger select — Validates: Requirements 10.10
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  };

  const handleDialogCancel = () => {
    setConfirmDialog(null);
    // Return focus to the trigger select — Validates: Requirements 10.10
    triggerRef.current?.focus();
    triggerRef.current = null;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span className="ml-2" style={{ color: 'var(--color-text-secondary)' }}>
          Loading users...
        </span>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
        <span className="ml-2" style={{ color: 'var(--color-error)' }}>
          {error}
        </span>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center gap-2 border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-error)' }} />
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        </div>
      )}

      {/* Table — scrolls horizontally on mobile (Req 9.3) */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '480px' }}>
          <caption className="sr-only">Users list — manage roles and view account details</caption>
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Display Name
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Role
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.userId}
                className="border-b transition-colors"
                style={{ borderColor: 'color-mix(in srgb, var(--color-border-subtle) 50%, transparent)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                    'color-mix(in srgb, var(--color-surface-elevated) 30%, transparent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                }}
              >
                <td
                  className="py-3 px-4 font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {user.displayName}
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {user.email}
                </td>
                <td className="py-3 px-4">
                  <div className="relative inline-block">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user, e.target.value as UserRole, e.currentTarget)
                      }
                      aria-label={`Change role for ${user.displayName}`}
                      className="appearance-none rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none transition-colors cursor-pointer border"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 50%, transparent)',
                        borderColor: 'var(--color-border-subtle)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="user">user</option>
                      <option value="manager">manager</option>
                    </select>
                    <ChevronDown
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                  </div>
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between mt-4 pt-4 border-t"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} users
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Previous
            </Button>
            <span className="px-3 py-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            isOpen={!!confirmDialog}
            userName={confirmDialog.userName}
            newRole={confirmDialog.newRole}
            onConfirm={confirmRoleChange}
            onCancel={handleDialogCancel}
            isLoading={isUpdatingRole}
          />
        )}
      </AnimatePresence>

      {/* ARIA live region for role change announcements — Validates: Requirements 10.9 */}
      {announcement && (
        <LiveAnnouncer
          message={announcement.message}
          politeness={announcement.politeness}
        />
      )}
    </div>
  );
}

// ─── Sessions Tab ───

function SessionsTab({ apiClient }: { apiClient: ApiClient }) {
  const [sessions, setSessions] = useState<SessionsListResponse['sessions']>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const fetchSessions = useCallback(
    async (currentOffset: number, userId?: string) => {
      setIsLoading(true);
      setError('');
      try {
        const response: SessionsListResponse = await apiClient.getAdminSessions(
          PAGE_SIZE,
          currentOffset,
          userId || undefined
        );
        setSessions(response.sessions);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient]
  );

  useEffect(() => {
    fetchSessions(offset, appliedFilter);
  }, [fetchSessions, offset, appliedFilter]);

  const handleFilterApply = () => {
    setOffset(0);
    setAppliedFilter(userIdFilter.trim());
  };

  const handleFilterClear = () => {
    setUserIdFilter('');
    setOffset(0);
    setAppliedFilter('');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span className="ml-2" style={{ color: 'var(--color-text-secondary)' }}>
          Loading sessions...
        </span>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
        <span className="ml-2" style={{ color: 'var(--color-error)' }}>
          {error}
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="session-user-filter" className="sr-only">
            Filter sessions by user ID
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            aria-hidden="true"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            id="session-user-filter"
            type="text"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterApply()}
            placeholder="Filter by user ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none transition-colors border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 50%, transparent)',
              borderColor: 'var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleFilterApply}>
          Filter
        </Button>
        {appliedFilter && (
          <Button variant="secondary" size="sm" onClick={handleFilterClear}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center gap-2 border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-error)' }} />
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        </div>
      )}

      {/* Table — scrolls horizontally on mobile (Req 9.3) */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '560px' }}>
          <caption className="sr-only">Sessions list — view all triage sessions and their status</caption>
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Session ID
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                User ID
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Status
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Current Stage
              </th>
              <th
                className="text-left py-3 px-4 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.sessionId}
                className="border-b transition-colors"
                style={{ borderColor: 'color-mix(in srgb, var(--color-border-subtle) 50%, transparent)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                    'color-mix(in srgb, var(--color-surface-elevated) 30%, transparent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                }}
              >
                <td
                  className="py-3 px-4 font-mono text-xs"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {session.sessionId.slice(0, 8)}...
                </td>
                <td
                  className="py-3 px-4 font-mono text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {session.userId ? `${session.userId.slice(0, 8)}...` : '—'}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={session.status} />
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {session.currentStage ?? '—'}
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date(session.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sessions.length === 0 && !isLoading && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
          No sessions found{appliedFilter ? ` for user "${appliedFilter}"` : ''}.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between mt-4 pt-4 border-t"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} sessions
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Previous
            </Button>
            <span className="px-3 py-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AdminPage Component ───

export function AdminPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const apiClient = new ApiClient(API_URL, API_KEY, () => token);

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold flex items-center gap-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <Shield className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          Admin Panel
        </h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Manage users and oversee system sessions
        </p>
      </div>

      {/* Tabs card */}
      <Card elevation="md" className="overflow-hidden">
        <div
          role="tablist"
          aria-label="Admin sections"
          className="flex border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`admin-tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
                style={{
                  color: isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'var(--color-text-secondary)';
                  }
                }}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="admin-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div
                key="users"
                id="admin-tabpanel-users"
                role="tabpanel"
                aria-labelledby="admin-tab-users"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <UsersTab apiClient={apiClient} />
              </motion.div>
            )}
            {activeTab === 'sessions' && (
              <motion.div
                key="sessions"
                id="admin-tabpanel-sessions"
                role="tabpanel"
                aria-labelledby="admin-tab-sessions"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <SessionsTab apiClient={apiClient} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
