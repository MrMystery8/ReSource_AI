/**
 * ThemeContext.tsx
 *
 * Provides light/dark theme management for the application.
 *
 * Resolution priority on mount:
 *   1. localStorage ('theme' key) — if value is 'light' or 'dark'
 *   2. OS prefers-color-scheme media query
 *   3. 'light' as default fallback
 *
 * Applies `data-theme` attribute to `document.documentElement` for CSS scoping.
 * Persists selection to localStorage; gracefully handles write failures.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.8, 2.9
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read the stored theme from localStorage.
 * Returns null if the key is absent, unreadable, or holds an invalid value.
 */
function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage unavailable (private browsing, security restrictions, etc.)
  }
  return null;
}

/**
 * Detect the OS color-scheme preference via matchMedia.
 * Returns null when matchMedia is unsupported.
 */
function detectOsTheme(): Theme | null {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
  } catch {
    // matchMedia not supported
  }
  return null;
}

/**
 * Resolve the initial theme following the priority chain:
 *   localStorage → OS preference → 'light' fallback
 */
function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? detectOsTheme() ?? 'light';
}

/**
 * Apply `data-theme` attribute to <html> synchronously.
 * This is called both on mount and on every theme change to keep the DOM
 * in sync with React state without requiring a page reload.
 */
function applyThemeToDOM(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Persist the theme to localStorage.
 * Silently swallows write failures (quota exceeded, private browsing, etc.)
 * so the theme still applies for the current session — Requirement 2.9.
 */
function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Write failed — theme still applies in memory for this session.
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * ThemeProvider wraps the application and manages theme state.
 *
 * Apply `data-theme` synchronously during the initial render (via useState
 * initializer) to avoid a flash of the wrong theme before the first paint.
 */
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = resolveInitialTheme();
    // Apply synchronously during initialization to prevent FOUC.
    applyThemeToDOM(initial);
    return initial;
  });

  /**
   * Sync data-theme whenever theme state changes (covers the toggle path).
   * The initial application is already handled in the useState initializer,
   * but this effect ensures any subsequent changes are reflected in the DOM.
   */
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  /**
   * Set an explicit theme value, update the DOM, and persist to localStorage.
   * Satisfies Requirements 2.3, 2.4, 2.8.
   */
  const setTheme = useCallback((newTheme: Theme): void => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    persistTheme(newTheme);
  }, []);

  /**
   * Toggle between 'light' and 'dark'.
   * Must apply within 100ms without a full page reload — Requirement 2.4.
   * CSS custom properties update instantly when data-theme changes.
   */
  const toggleTheme = useCallback((): void => {
    setThemeState((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      applyThemeToDOM(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTheme returns the current theme context value.
 * Throws if called outside a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeContext };
