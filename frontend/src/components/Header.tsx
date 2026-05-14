import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link } from 'react-router-dom';
import {
  Leaf,
  Menu,
  X,
  User,
  LogOut,
  Shield,
  ChevronDown,
  Trophy,
  History,
  Recycle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type { UserLevel, UserStatsResponse } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

const LEVEL_COLORS: Record<UserLevel, string> = {
  Recycler: 'text-primary-600 bg-primary-50 border-primary-200',
  Salvager: 'text-info-600 bg-info-50 border-info-100',
  'E-Waste Champion': 'text-accent-600 bg-accent-50 border-accent-200',
  'Green Guardian': 'text-warning-600 bg-warning-50 border-warning-100',
};

function LevelBadge({ level, points }: { level?: UserLevel; points?: number }) {
  const displayLevel = level ?? 'Recycler';
  const displayPoints = points ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${LEVEL_COLORS[displayLevel]}`}
      >
        {displayLevel}
      </span>
      <span className="text-xs text-text-secondary font-medium tabular-nums">
        {displayPoints.toLocaleString()} pts
      </span>
    </div>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors duration-150 px-3 py-2 rounded-md ${
    isActive
      ? 'text-primary-700 bg-primary-50'
      : 'text-text-secondary hover:text-text-primary hover:bg-stone-100'
  }`;

export function Header() {
  const { user, isAuthenticated, token, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchStats = () => {
      const apiClient = new ApiClient(API_URL, API_KEY, () => token);
      apiClient.getStats().then(setStats).catch(() => {});
    };

    fetchStats();

    const handleGamificationUpdate = () => fetchStats();
    window.addEventListener('gamification:updated', handleGamificationUpdate);
    return () => window.removeEventListener('gamification:updated', handleGamificationUpdate);
  }, [isAuthenticated, token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface-card/95  border-b border-border-subtle">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Recycle className="w-4.5 h-4.5 text-text-primary" />
            </div>
            <span className="text-base font-semibold text-text-primary">
              ReSource AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated && (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  <span className="flex items-center gap-1.5">
                    <Leaf className="w-4 h-4" />
                    Triage
                  </span>
                </NavLink>
                <NavLink to="/history" className={navLinkClass}>
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    History
                  </span>
                </NavLink>
                <NavLink to="/leaderboard" className={navLinkClass}>
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </span>
                </NavLink>
                {user?.role === 'manager' && (
                  <NavLink to="/admin" className={navLinkClass}>
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      Admin
                    </span>
                  </NavLink>
                )}
              </>
            )}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <LevelBadge level={stats?.level} points={stats?.points} />

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-stone-100 transition-colors duration-150"
                    aria-expanded={profileDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary-700" />
                    </div>
                    <span className="max-w-[120px] truncate">
                      {user?.displayName ?? 'User'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        profileDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1.5 w-44 rounded-lg bg-surface-card border border-border-default shadow-[0_4px_12px_oklch(0_0_0/0.06)] overflow-hidden"
                        role="menu"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-stone-50 transition-colors"
                          role="menuitem"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm text-text-secondary hover:text-danger-600 hover:bg-danger-50 transition-colors border-t border-border-subtle"
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-stone-100 transition-colors duration-150"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-text-primary px-3.5 py-2 rounded-md bg-primary-600 hover:bg-primary-700 transition-colors duration-150"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-stone-100 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border-subtle"
          >
            <div className="px-4 py-3 space-y-1 bg-surface-card">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user?.displayName ?? 'User'}
                      </p>
                      <LevelBadge level={stats?.level} points={stats?.points} />
                    </div>
                  </div>

                  <NavLink
                    to="/"
                    end
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-700 bg-primary-50'
                          : 'text-text-secondary hover:text-text-primary hover:bg-stone-100'
                      }`
                    }
                  >
                    <Leaf className="w-4 h-4" />
                    Triage
                  </NavLink>
                  <NavLink
                    to="/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-700 bg-primary-50'
                          : 'text-text-secondary hover:text-text-primary hover:bg-stone-100'
                      }`
                    }
                  >
                    <History className="w-4 h-4" />
                    History
                  </NavLink>
                  <NavLink
                    to="/leaderboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-700 bg-primary-50'
                          : 'text-text-secondary hover:text-text-primary hover:bg-stone-100'
                      }`
                    }
                  >
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </NavLink>
                  {user?.role === 'manager' && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-primary-700 bg-primary-50'
                            : 'text-text-secondary hover:text-text-primary hover:bg-stone-100'
                        }`
                      }
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </NavLink>
                  )}

                  <div className="border-t border-border-subtle my-2" />

                  <NavLink
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-700 bg-primary-50'
                          : 'text-text-secondary hover:text-text-primary hover:bg-stone-100'
                      }`
                    }
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </NavLink>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </>
              ) : (
                <div className="space-y-2 py-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center text-sm font-medium text-text-secondary hover:text-text-primary px-4 py-2.5 rounded-md hover:bg-stone-100 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center text-sm font-medium text-text-primary px-4 py-2.5 rounded-md bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
