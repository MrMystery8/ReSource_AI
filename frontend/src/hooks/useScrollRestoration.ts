import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'scroll-positions';

/**
 * Reads the scroll position map from sessionStorage.
 * Returns an empty object if sessionStorage is unavailable or the data is invalid.
 */
function readPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, number>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Writes the scroll position map to sessionStorage.
 * Silently ignores errors (e.g. private browsing, quota exceeded).
 */
function writePositions(positions: Record<string, number>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // sessionStorage unavailable — positions are only kept in-memory ref
  }
}

/**
 * Saves the scroll position for a given pathname.
 */
function savePosition(pathname: string, y: number): void {
  const positions = readPositions();
  positions[pathname] = y;
  writePositions(positions);
}

/**
 * Retrieves the saved scroll position for a given pathname.
 * Returns 0 if no position has been saved.
 */
function getSavedPosition(pathname: string): number {
  const positions = readPositions();
  return positions[pathname] ?? 0;
}

/**
 * useScrollRestoration
 *
 * Scrolls to top on navigation by default (when clicking nav links).
 * Only restores scroll position when using browser back/forward buttons.
 * - When the route changes, the previous route's scroll position is saved to
 *   sessionStorage before the new route renders.
 * - After the new route renders:
 *   - If navigating via back/forward (history.state.idx changed), restore saved position
 *   - Otherwise (clicking nav links), scroll to top
 * - Positions are retained for the duration of the browser session.
 *
 * Usage: call this hook once inside AppShell or at the router level.
 *
 * Validates: Requirements 4.4
 */
export function useScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPathname = location.pathname;
    const prevPathname = prevPathnameRef.current;

    // Save the scroll position of the route we are navigating AWAY from
    if (prevPathname !== null && prevPathname !== currentPathname) {
      savePosition(prevPathname, window.scrollY);
    }

    // React Router marks browser back/forward as POP.
    const isBackForward = navigationType === 'POP';

    // Restore scroll position only for back/forward, otherwise scroll to top
    const targetY = isBackForward ? getSavedPosition(currentPathname) : 0;

    // Scroll immediately to prevent any flash of wrong position
    window.scrollTo(0, targetY);

    // Also schedule a second scroll after render to ensure it sticks
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, targetY);
      
      // And one more after a tick to be absolutely sure
      setTimeout(() => {
        window.scrollTo(0, targetY);
      }, 0);
    });

    // Update refs for the next navigation
    prevPathnameRef.current = currentPathname;

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [location.pathname, navigationType]);
}
