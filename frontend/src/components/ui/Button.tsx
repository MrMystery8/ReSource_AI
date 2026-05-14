/**
 * Button.tsx
 *
 * Reusable button component with three variants (primary, secondary, destructive),
 * three sizes (sm, md, lg), loading state, and icon slots.
 *
 * States: default, hover, active (scale 0.97), focus (ring), disabled (opacity 0.5)
 * Touch targets: min 44×44px on mobile (enforced via min-h)
 *
 * Validates: Requirements 7.1, 7.5, 7.8, 10.2
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg ' +
  'border transition-all duration-150 ease-out cursor-pointer select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'active:scale-[0.97] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'min-h-[44px]'; // WCAG / touch target floor

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--color-primary)] text-white border-transparent ' +
    'hover:bg-[var(--color-primary-hover)] ' +
    'focus-visible:ring-[var(--color-primary)]',

  secondary:
    'bg-transparent text-[var(--color-text-primary)] border-[var(--color-border-default)] ' +
    'hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-border-default)] ' +
    'focus-visible:ring-[var(--color-primary)]',

  destructive:
    'bg-[var(--color-error)] text-white border-transparent ' +
    'hover:opacity-90 ' +
    'focus-visible:ring-[var(--color-error)]',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px] sm:min-h-[44px]',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps): JSX.Element {
  const classes = [BASE, VARIANT_STYLES[variant], SIZE_STYLES[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
    >
      {isLoading ? (
        <Loader2
          size={16}
          className="animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        leftIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}

      {children}

      {!isLoading && rightIcon && (
        <span className="shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
}

export default Button;
