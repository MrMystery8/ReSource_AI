/**
 * RouteAnnouncer — accessibility component
 *
 * Listens to React Router route changes and:
 *   1. Updates an aria-live="polite" region with the new page title so screen
 *      readers announce the navigation.
 *   2. Moves focus to the #main-content element so keyboard users land at the
 *      top of the new page content rather than wherever focus happened to be.
 *
 * The live region is visually hidden (sr-only pattern) but fully readable by
 * assistive technology.
 *
 * Requirements: 10.8
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Maps known route paths to human-readable page titles. */
const PATH_TITLE_MAP: Record<string, string> = {
  '/': 'Triage — ReSource AI',
  '/login': 'Login — ReSource AI',
  '/register': 'Register — ReSource AI',
  '/history': 'History — ReSource AI',
  '/leaderboard': 'Leaderboard — ReSource AI',
  '/profile': 'Profile — ReSource AI',
  '/admin': 'Admin — ReSource AI',
};

/**
 * Derives a human-readable page title from the current pathname.
 * Falls back to `document.title` (which may be set by the page itself) and
 * then to a capitalised version of the last path segment.
 */
function derivePageTitle(pathname: string): string {
  // Exact match first
  if (PATH_TITLE_MAP[pathname]) {
    return PATH_TITLE_MAP[pathname];
  }

  // Dynamic segments — e.g. /history/:sessionId, /guide/:projectId
  if (pathname.startsWith('/history/')) {
    return 'Session Detail — ReSource AI';
  }
  if (pathname.startsWith('/guide/')) {
    return 'Implementation Guide — ReSource AI';
  }

  // Fall back to document.title if it has been updated by the page
  if (typeof document !== 'undefined' && document.title) {
    return document.title;
  }

  // Last resort: capitalise the last path segment
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? 'Page';
  return `${last.charAt(0).toUpperCase()}${last.slice(1)} — ReSource AI`;
}

/** Visually hidden style (sr-only pattern). */
const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function RouteAnnouncer(): JSX.Element {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');
  // Track whether this is the initial mount so we don't announce on first load
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip announcement on the very first render (page load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Derive the title for the new route
    const title = derivePageTitle(location.pathname);

    // Clear the region first so screen readers re-announce even if the title
    // is the same (e.g. navigating to the same route twice).
    setAnnouncement('');

    // Use a short timeout to ensure the DOM update is flushed before setting
    // the new announcement text, which triggers the aria-live announcement.
    const announceTimer = setTimeout(() => {
      setAnnouncement(`Navigated to ${title}`);
    }, 50);

    // Move focus to the main content area so keyboard users start at the top
    // of the new page rather than wherever focus was before navigation.
    const focusTimer = setTimeout(() => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        // Make the element programmatically focusable if it isn't already
        if (!mainContent.hasAttribute('tabindex')) {
          mainContent.setAttribute('tabindex', '-1');
        }
        // Keep accessibility focus behavior without forcing a scroll jump
        // that can place content under the sticky header on route changes.
        mainContent.focus({ preventScroll: true });
      }
    }, 100);

    return () => {
      clearTimeout(announceTimer);
      clearTimeout(focusTimer);
    };
  }, [location.pathname]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      style={srOnlyStyle}
    >
      {announcement}
    </div>
  );
}

export default RouteAnnouncer;
