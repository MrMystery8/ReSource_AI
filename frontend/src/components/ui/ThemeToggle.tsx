/**
 * ThemeToggle.tsx
 *
 * Icon-only button that switches between light and dark themes.
 *
 * - Sun icon when dark mode is active (click → switch to light)
 * - Moon icon when light mode is active (click → switch to dark)
 * - aria-label describes the action that will be performed
 * - 44×44px minimum touch target (Requirement 7.8, 10.2)
 * - Keyboard operable (Enter / Space via native <button>)
 *
 * Validates: Requirements 2.4, 2.5, 7.8, 10.2
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  const defaultBackground = 'color-mix(in srgb, var(--color-primary) 10%, transparent)';
  const hoverBackground = 'color-mix(in srgb, var(--color-primary) 18%, transparent)';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={[
        // Minimum 44×44px touch target
        'flex items-center justify-center w-11 h-11 rounded-lg',
        'active:scale-[0.97]',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        'cursor-pointer',
      ].join(' ')}
      style={{
        color: 'var(--color-primary)',
        backgroundColor: defaultBackground,
        border: '1px solid color-mix(in srgb, var(--color-primary) 28%, transparent)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = hoverBackground;
        (e.currentTarget as HTMLElement).style.color = 'var(--color-primary-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = defaultBackground;
        (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)';
      }}
    >
      {isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;
