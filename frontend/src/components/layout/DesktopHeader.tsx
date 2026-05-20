/**
 * DesktopHeader.tsx
 *
 * Top navigation bar for desktop viewports (≥768px).
 * Hidden below 768px — MobileBottomNav handles smaller screens.
 *
 * Contains:
 *  - Logo: "ReSource AI" with the brand image, no glow/animation
 *  - Horizontal nav links with icon + text label (NavLink active state)
 *  - Active item: primary color text + bg-primary/10 background
 *  - User profile dropdown (avatar initials, display name, level badge, logout)
 *
 * Accessibility:
 *  - All interactive elements have visible focus rings (2–4px, primary color)
 *  - Tab order: logo → nav links (L→R) → profile trigger
 *  - Dropdown: focus trap, Escape to close, focus returns to trigger on close
 *  - aria-expanded on dropdown trigger, role="menu" on dropdown list
 *
 * Validates: Requirements 4.1, 4.3, 4.6, 4.7, 5.1, 5.2, 5.3
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Leaf,
  History,
  Trophy,
  User,
  Shield,
  Users,
  LogOut,
  ChevronDown,
  type LucideProps,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiClient } from '../../services/api';
import type { UserLevel, UserStatsResponse } from '@resource-ai/shared';
import { SITE_LOGO_URL } from '../../lib/siteAssets';
import { Avatar } from '../ui/Avatar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

type LucideIcon = React.ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
>;

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  requiresAuth: boolean;
  requiresManager?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/triage', label: 'Triage', icon: Leaf, requiresAuth: true },
  { path: '/community', label: 'Community', icon: Users, requiresAuth: true },
  { path: '/history', label: 'History', icon: History, requiresAuth: true },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy, requiresAuth: true },
  { path: '/profile', label: 'Profile', icon: User, requiresAuth: true },
  { path: '/admin', label: 'Admin', icon: Shield, requiresAuth: true, requiresManager: true },
];

// Level badge color tokens — semantic, no raw hex
const LEVEL_BADGE_STYLES: Record<UserLevel, { color: string; bg: string; border: string }> = {
  Recycler: {
    color: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
  },
  'Eco-Sorter': {
    color: '#2dd4bf',
    bg: 'color-mix(in srgb, #2dd4bf 12%, transparent)',
    border: 'color-mix(in srgb, #2dd4bf 30%, transparent)',
  },
  'Resource Salvager': {
    color: '#60a5fa',
    bg: 'color-mix(in srgb, #60a5fa 12%, transparent)',
    border: 'color-mix(in srgb, #60a5fa 30%, transparent)',
  },
  'Triage Specialist': {
    color: '#818cf8',
    bg: 'color-mix(in srgb, #818cf8 12%, transparent)',
    border: 'color-mix(in srgb, #818cf8 30%, transparent)',
  },
  'E-Waste Champion': {
    color: '#a78bfa',
    bg: 'color-mix(in srgb, #a78bfa 12%, transparent)',
    border: 'color-mix(in srgb, #a78bfa 30%, transparent)',
  },
  'Green Guardian': {
    color: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
  },
  'Eco-Legend': {
    color: '#f43f5e',
    bg: 'color-mix(in srgb, #f43f5e 12%, transparent)',
    border: 'color-mix(in srgb, #f43f5e 30%, transparent)',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LevelBadgeProps {
  level: UserLevel;
}

function LevelBadge({ level }: LevelBadgeProps): JSX.Element {
  const styles = LEVEL_BADGE_STYLES[level];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
      style={{
        color: styles.color,
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
      }}
    >
      {level}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Profile Dropdown
// ---------------------------------------------------------------------------

interface ProfileDropdownProps {
  displayName: string;
  avatarUrl?: string;
  level: UserLevel | null;
  onClose: () => void;
  onLogout: () => void;
}

function ProfileDropdown({
  displayName,
  avatarUrl,
  level,
  onClose,
  onLogout,
}: ProfileDropdownProps): JSX.Element {
  const profileLinkRef = useRef<HTMLAnchorElement>(null);
  const logoutBtnRef = useRef<HTMLButtonElement>(null);

  // Focus first item when dropdown opens
  useEffect(() => {
    profileLinkRef.current?.focus();
  }, []);

  // Focus trap: cycle Tab/Shift+Tab within the two focusable items
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = [profileLinkRef.current, logoutBtnRef.current].filter(
          Boolean
        ) as HTMLElement[];
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      role="menu"
      aria-label="User menu"
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50"
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border-default)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* User info header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <div className="flex items-center gap-3">
          <Avatar name={displayName} src={avatarUrl} sizeClassName="w-10 h-10" textClassName="text-sm" />
          <div className="min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {displayName}
            </p>
            {level && (
              <div className="mt-1">
                <LevelBadge level={level} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <Link
          ref={profileLinkRef}
          to="/profile"
          role="menuitem"
          onClick={onClose}
          className={[
            'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
            'focus-visible:ring-[var(--color-primary)]',
          ].join(' ')}
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              'var(--color-surface-card)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
          }}
        >
          <User size={15} aria-hidden="true" />
          Profile
        </Link>

        <button
          ref={logoutBtnRef}
          type="button"
          role="menuitem"
          onClick={onLogout}
          className={[
            'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
            'focus-visible:ring-[var(--color-primary)]',
            'border-t',
          ].join(' ')}
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border-default)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              'color-mix(in srgb, var(--color-error) 8%, transparent)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-error)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
          }}
        >
          <LogOut size={15} aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DesktopHeader
// ---------------------------------------------------------------------------

export function DesktopHeader(): JSX.Element {
  const { user, isAuthenticated, token, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);

  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ── Fetch gamification stats ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchStats = () => {
      const client = new ApiClient(API_URL, API_KEY, () => token);
      client.getStats().then(setStats).catch(() => {
        // Silently ignore — level badge is optional
      });
    };

    fetchStats();

    const handleUpdate = () => fetchStats();
    window.addEventListener('gamification:updated', handleUpdate);
    return () => window.removeEventListener('gamification:updated', handleUpdate);
  }, [isAuthenticated, token]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [dropdownOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDropdownClose = useCallback(() => {
    setDropdownOpen(false);
    // Return focus to trigger button
    triggerRef.current?.focus();
  }, []);

  const handleLogout = useCallback(() => {
    setDropdownOpen(false);
    logout();
  }, [logout]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
        triggerRef.current?.focus();
      }
    },
    [dropdownOpen]
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = user?.displayName ?? 'User';
  const isManager = user?.role === 'manager';

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.requiresAuth) return true;
    if (!isAuthenticated) return false;
    if (item.requiresManager && !isManager) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <header
      className="hidden md:flex h-16 items-center backdrop-blur-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 85%, transparent)',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      <div className="w-full max-w-6xl mx-auto px-6 flex items-center justify-between gap-4">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <Link
          to="/"
          aria-label="ReSource AI — go to home"
          className={[
            'flex items-center gap-2.5 shrink-0 rounded-lg px-1 py-1',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          ].join(' ')}
        >
          <img
            src={SITE_LOGO_URL}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 rounded-lg object-cover"
            loading="eager"
            decoding="async"
          />
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            ReSource AI
          </span>
        </Link>

        {/* ── Nav links ────────────────────────────────────────────────── */}
        {isAuthenticated && (
          <nav aria-label="Main navigation">
            <ul className="flex items-center gap-1" role="list">
              {visibleNavItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/triage'}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2',
                        'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1',
                        isActive
                          ? 'text-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)]',
                      ].join(' ')
                    }
                  >
                    <item.icon size={16} aria-hidden={true} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ── Right section ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Profile dropdown */}
          {isAuthenticated && (
            <div className="relative" ref={dropdownContainerRef}>
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                aria-label={`${displayName} — open user menu`}
                onClick={() => setDropdownOpen((prev) => !prev)}
                onKeyDown={handleTriggerKeyDown}
                className={[
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                  'cursor-pointer',
                ].join(' ')}
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--color-surface-card)';
                  (e.currentTarget as HTMLElement).style.color =
                    'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLElement).style.color =
                    'var(--color-text-secondary)';
                }}
              >
                <Avatar
                  name={displayName}
                  src={user?.avatarUrl}
                  sizeClassName="w-7 h-7"
                  textClassName="text-[11px]"
                />

                {/* Display name */}
                <span className="max-w-[120px] truncate">{displayName}</span>

                {/* Chevron */}
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={`transition-transform duration-150 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <ProfileDropdown
                  displayName={displayName}
                  avatarUrl={user?.avatarUrl}
                  level={stats?.level ?? null}
                  onClose={handleDropdownClose}
                  onLogout={handleLogout}
                />
              )}
            </div>
          )}

          {/* Unauthenticated: login / register links */}
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className={[
                  'px-3 py-2 rounded-lg text-sm font-medium',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                ].join(' ')}
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    'var(--color-text-primary)';
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--color-surface-card)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    'var(--color-text-secondary)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className={[
                  'px-3 py-2 rounded-lg text-sm font-medium text-white',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                ].join(' ')}
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--color-primary)';
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DesktopHeader;
