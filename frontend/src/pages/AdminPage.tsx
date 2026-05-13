import { useState, useEffect, useCallback } from 'react';
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
import type {
  UserProfile,
  UserRole,
  UsersListResponse,
  SessionsListResponse,
} from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const PAGE_SIZE = 10;

type Tab = 'users' | 'sessions';

// ─── Risk Level Badge ───

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-text-muted text-sm">—</span>;

  const colors: Record<string, string> = {
    Green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Red: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[level] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}
    >
      {level}
    </span>
  );
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    failed: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative glass-card p-6 w-full max-w-sm mx-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Confirm Role Change</h3>
        </div>
        <p className="text-text-secondary text-sm mb-6">
          Are you sure you want to change <span className="text-white font-medium">{userName}</span>&apos;s role to{' '}
          <span className="text-primary-400 font-medium">{newRole}</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-white bg-surface-elevated/50 border border-border-subtle hover:border-border-default transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            Confirm
          </button>
        </div>
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

  const handleRoleChange = (user: UserProfile, newRole: UserRole) => {
    if (newRole === user.role) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
      setConfirmDialog(null);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        <span className="ml-2 text-text-secondary">Loading users...</span>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <AlertCircle className="w-5 h-5 text-rose-400" />
        <span className="ml-2 text-rose-300">{error}</span>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Display Name
                </div>
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </div>
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Role
                </div>
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
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
                className="border-b border-border-subtle/50 hover:bg-surface-elevated/30 transition-colors"
              >
                <td className="py-3 px-4 text-white font-medium">
                  {user.displayName}
                </td>
                <td className="py-3 px-4 text-text-secondary">{user.email}</td>
                <td className="py-3 px-4">
                  <div className="relative inline-block">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user, e.target.value as UserRole)
                      }
                      className="appearance-none bg-surface-elevated/50 border border-border-subtle rounded-lg px-3 py-1.5 pr-8 text-sm text-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 transition-colors cursor-pointer"
                    >
                      <option value="user">user</option>
                      <option value="manager">manager</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>
                </td>
                <td className="py-3 px-4 text-text-secondary">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
          <span className="text-text-secondary text-sm">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} users
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white bg-surface-elevated/50 border border-border-subtle hover:border-border-default transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-text-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white bg-surface-elevated/50 border border-border-subtle hover:border-border-default transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
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
            onCancel={() => setConfirmDialog(null)}
            isLoading={isUpdatingRole}
          />
        )}
      </AnimatePresence>
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
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        <span className="ml-2 text-text-secondary">Loading sessions...</span>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <AlertCircle className="w-5 h-5 text-rose-400" />
        <span className="ml-2 text-rose-300">{error}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterApply()}
            placeholder="Filter by user ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-elevated/50 border border-border-subtle text-white placeholder-text-muted text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 transition-colors"
          />
        </div>
        <button
          onClick={handleFilterApply}
          className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 transition-colors"
        >
          Filter
        </button>
        {appliedFilter && (
          <button
            onClick={handleFilterClear}
            className="px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-white bg-surface-elevated/50 border border-border-subtle hover:border-border-default transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Session ID
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                User ID
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Status
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Current Stage
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.sessionId}
                className="border-b border-border-subtle/50 hover:bg-surface-elevated/30 transition-colors"
              >
                <td className="py-3 px-4 text-white font-mono text-xs">
                  {session.sessionId.slice(0, 8)}...
                </td>
                <td className="py-3 px-4 text-text-secondary font-mono text-xs">
                  {session.userId ? `${session.userId.slice(0, 8)}...` : '—'}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={session.status} />
                </td>
                <td className="py-3 px-4 text-text-secondary">
                  {session.currentStage ?? '—'}
                </td>
                <td className="py-3 px-4 text-text-secondary">
                  {new Date(session.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sessions.length === 0 && !isLoading && (
        <div className="text-center py-12 text-text-secondary">
          No sessions found{appliedFilter ? ` for user "${appliedFilter}"` : ''}.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
          <span className="text-text-secondary text-sm">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}{' '}
            sessions
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white bg-surface-elevated/50 border border-border-subtle hover:border-border-default transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-text-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white bg-surface-elevated/50 border border-border-subtle hover:border-border-default transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
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
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-400" />
          Admin Panel
        </h1>
        <p className="text-text-secondary mt-1">
          Manage users and oversee system sessions
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-border-subtle">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="admin-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400"
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
      </div>
    </motion.div>
  );
}
