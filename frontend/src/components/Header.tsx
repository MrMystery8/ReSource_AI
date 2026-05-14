import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link } from 'react-router-dom';
import {
  Recycle,
  Zap,
  Menu,
  X,
  User,
  LogOut,
  Shield,
  ChevronDown,
  Trophy,
  History,
  Leaf,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type { UserLevel, UserStatsResponse } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

const LEVEL_COLORS: Record<UserLevel, string> = {
  Recycler: 'text-emerald-400',
  Salvager: 'text-blue-400',
  'E-Waste Champion': 'text-purple-400',
  'Green Guardian': 'text-amber-400',
};

const LEVEL_GLOW: Record<UserLevel, string> = {
  Recycler: 'shadow-emerald-400/30',
  Salvager: 'shadow-blue-400/30',
  'E-Waste Champion': 'shadow-purple-400/30',
  'Green Guardian': 'shadow-amber-400/30',
};

function LevelBadgeInline({ level, points }: { level?: UserLevel; points?: number }) {
  const displayLevel = level ?? 'Recycler';
  const displayPoints = points ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shadow-sm ${LEVEL_COLORS[displayLevel]} ${LEVEL_GLOW[displayLevel]}`}
      >
        {displayLevel}
      </span>
      <span className="text-xs text-text-secondary font-medium">
        {displayPoints.toLocaleString()} pts
      </span>
    </div>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors duration-200 px-3 py-2 rounded-lg ${
    isActive
      ? 'text-primary-300 bg-primary-500/10'
      : 'text-text-secondary hover:text-white hover:bg-white/5'
  }`;

export function Header() {
  const { user, isAuthenticated, token, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch stats on mount and when gamification updates
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchStats = () => {
      const apiClient = new ApiClient(API_URL, API_KEY, () => token);
      apiClient.getStats().then(setStats).catch(() => {
        // Silently ignore stats fetch failures
      });
    };

    fetchStats();

    const handleGamificationUpdate = () => {
      fetchStats();
    };

    window.addEventListener('gamification:updated', handleGamificationUpdate);
    return () => {
      window.removeEventListener('gamification:updated', handleGamificationUpdate);
    };
  }, [isAuthenticated, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <header className="relative z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center glow-primary">
                <Recycle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-2 h-2 text-surface" />
              </motion.div>
            </motion.div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-primary-200 to-primary-400 bg-clip-text text-transparent">
              ReSource AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
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
            ) : null}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Level Badge + Points */}
                <LevelBadgeInline
                  level={stats?.level}
                  points={stats?.points}
                />

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors duration-200"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="max-w-[120px] truncate">
                      {user?.displayName ?? 'User'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        profileDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-800/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 overflow-hidden"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-secondary hover:text-rose-400 hover:bg-rose-500/5 transition-colors border-t border-white/5"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
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
                  className="text-sm font-medium text-text-secondary hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 transition-colors duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            className="md:hidden overflow-hidden border-t border-white/5"
          >
            <div className="px-4 py-4 space-y-1 bg-surface-900/95 backdrop-blur-xl">
              {isAuthenticated ? (
                <>
                  {/* User info */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user?.displayName ?? 'User'}
                      </p>
                      <LevelBadgeInline
                        level={stats?.level}
                        points={stats?.points}
                      />
                    </div>
                  </div>

                  {/* Nav Links */}
                  <NavLink
                    to="/"
                    end
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-300 bg-primary-500/10'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
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
                      `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-300 bg-primary-500/10'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
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
                      `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-300 bg-primary-500/10'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
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
                        `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-primary-300 bg-primary-500/10'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </NavLink>
                  )}

                  {/* Divider */}
                  <div className="border-t border-white/5 my-2" />

                  <NavLink
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary-300 bg-primary-500/10'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
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
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center text-sm font-medium text-text-secondary hover:text-white px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center text-sm font-medium text-white px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 transition-colors"
                  >
                    Register
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
