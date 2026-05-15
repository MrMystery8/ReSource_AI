/**
 * AppShell — main layout wrapper component
 *
 * Responsibilities:
 *   - Renders SkipLink as the first focusable element in the DOM
 *   - Renders DesktopHeader (visible at ≥768px, hidden below)
 *   - Renders MobileBottomNav (visible below 768px, hidden at ≥768px)
 *   - Renders <main id="main-content"> with max-w-6xl, centered, responsive padding
 *   - Applies bottom padding on mobile to prevent content being obscured by the fixed bottom nav
 *   - Renders RouteAnnouncer for screen reader page-change announcements
 *   - Calls useScrollRestoration to preserve/restore scroll position per route
 *
 * Requirements: 4.1, 4.2, 6.1, 6.2, 6.5
 */

import type { ReactNode } from 'react';
import { SkipLink } from './SkipLink';
import { RouteAnnouncer } from './RouteAnnouncer';
// DesktopHeader and MobileBottomNav are created in tasks 2.2 and 2.3.
// Importing from their expected paths; the build is verified at the checkpoint task.
import { DesktopHeader } from './DesktopHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import { BackgroundGradientAnimation } from '../ui/background-gradient-animation';
import { useTheme } from '../../contexts/ThemeContext';

export interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell wraps every authenticated page with the shared navigation chrome
 * and a semantically correct main content area.
 */
export function AppShell({ children }: AppShellProps): JSX.Element {
  // Preserve and restore scroll position per route pathname (Requirement 4.4)
  useScrollRestoration();
  const { theme } = useTheme();

  const backgroundProps =
    theme === 'dark'
      ? {
          gradientBackgroundStart: 'rgb(7, 12, 9)',
          gradientBackgroundEnd: 'rgb(14, 20, 16)',
          firstColor: '56, 127, 102',
          secondColor: '91, 108, 74',
          thirdColor: '50, 107, 90',
          fourthColor: '113, 98, 66',
          fifthColor: '68, 119, 94',
          pointerColor: '85, 115, 101',
          blendingValue: 'screen',
        }
      : {
          gradientBackgroundStart: 'rgb(249, 252, 249)',
          gradientBackgroundEnd: 'rgb(241, 247, 243)',
          firstColor: '120, 166, 140',
          secondColor: '161, 142, 90',
          thirdColor: '94, 129, 116',
          fourthColor: '148, 133, 99',
          fifthColor: '111, 154, 131',
          pointerColor: '140, 160, 150',
          blendingValue: 'soft-light',
        };

  return (
    <BackgroundGradientAnimation
      interactive={false}
      className="relative z-10"
      containerClassName="min-h-dvh w-full"
      {...backgroundProps}
    >
      <div className="relative isolate min-h-dvh">
        {/* 1. SkipLink MUST be the first focusable element (Requirement 4.8, 10.4) */}
        <SkipLink />

        {/*
         * 2. Desktop header — hidden below 768px via Tailwind responsive utilities.
         *    Sticky positioning on the outer wrapper so it stays at top on scroll.
         *    (Requirement 4.1)
         */}
        <div className="hidden md:block sticky top-0 z-40">
          <DesktopHeader />
        </div>

        {/*
         * 3. Main content area (Requirement 6.1, 6.2, 6.5)
         *
         *    id="main-content" — target for the SkipLink href and RouteAnnouncer focus
         *    max-w-6xl mx-auto — constrain to 72rem and center horizontally
         *    px-4 — 16px horizontal padding on mobile (Requirement 6.2)
         *    md:px-6 — 24px horizontal padding at ≥768px (Requirement 6.2)
         *    pb-[calc(64px+16px)] — reserve space for the 64px fixed bottom nav
         *      plus 16px gap on mobile so content is never obscured (Requirement 6.5)
         *    md:pb-0 — no bottom padding needed on desktop (no bottom nav)
         *    w-full — fill available width before max-w-6xl kicks in
         */}
        <main
          id="main-content"
          className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-[calc(64px+32px)] md:pb-8"
        >
          {children}
        </main>

        {/*
         * 4. Mobile bottom nav — visible below 768px only.
         *    Uses `flex md:hidden` so it is removed from layout on desktop.
         *    (Requirement 4.2)
         */}
        <div className="flex md:hidden">
          <MobileBottomNav />
        </div>

        {/*
         * 5. RouteAnnouncer — visually hidden ARIA live region.
         *    Announces page title changes to screen readers on route transitions
         *    and moves focus to #main-content. (Requirement 10.8)
         */}
        <RouteAnnouncer />
      </div>
    </BackgroundGradientAnimation>
  );
}

export default AppShell;
