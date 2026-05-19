/**
 * MobileBottomNav — fixed bottom navigation bar for mobile viewports (<768px)
 *
 * Displays up to 5 navigation items with icon + text label. For managers the
 * Admin item is shown; for regular users Profile is shown in its place.
 * All items meet the 44×44px minimum touch target requirement and have at
 * least 8px spacing between them.
 *
 * Safe-area padding is applied via env(safe-area-inset-bottom) so the bar
 * sits above the home indicator on notched devices.
 *
 * Requirements: 4.2, 4.3, 4.5, 9.4
 */

import { NavLink } from 'react-router-dom';
import { Leaf, History, Trophy, User, Shield, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

/** Items shown to all authenticated users (no admin). */
const BASE_NAV_ITEMS: NavItem[] = [
  { path: '/triage', label: 'Triage', icon: Leaf },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/profile', label: 'Profile', icon: User },
];

/** Admin item shown only to managers (replaces Profile slot). */
const ADMIN_NAV_ITEM: NavItem = { path: '/admin', label: 'Admin', icon: Shield };

export function MobileBottomNav(): JSX.Element {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  // Managers get: Triage, History, Leaderboard, Profile, Admin (all 5)
  // Regular users get: Triage, History, Leaderboard, Profile (4 items)
  const navItems: NavItem[] = isManager
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : BASE_NAV_ITEMS;

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        borderTop: '1px solid var(--color-border-default)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul
        className="flex items-stretch justify-around gap-2 px-2"
        style={{ height: '56px' }}
        role="list"
      >
        {navItems.map(({ path, label, icon: Icon }) => (
          <li key={path} className="flex flex-1">
            <NavLink
              to={path}
              end={path === '/triage'}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] rounded-md transition-colors duration-150"
              style={({ isActive }) => ({
                color: isActive
                  ? 'var(--color-primary)'
                  : 'var(--color-text-muted)',
              })}
              aria-current={undefined /* NavLink handles this via className */}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  <span
                    className="leading-none font-medium"
                    style={{ fontSize: '10px' }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default MobileBottomNav;
