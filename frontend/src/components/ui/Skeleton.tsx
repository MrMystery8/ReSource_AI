/**
 * Skeleton.tsx
 *
 * Loading placeholder with three shape variants:
 *   - text:        short rounded bar (mimics a line of text)
 *   - circular:    circle (mimics an avatar)
 *   - rectangular: full-width block (mimics a card or image)
 *
 * Uses the `skeleton-pulse` CSS class from animations.css (opacity-based pulse).
 * Respects prefers-reduced-motion — animations.css already suppresses the
 * animation and sets a static opacity of 0.7 for reduced-motion users.
 *
 * Validates: Requirements 8.1, 5.6, 10.7
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCSSValue(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

// ---------------------------------------------------------------------------
// Variant defaults
// ---------------------------------------------------------------------------

const VARIANT_DEFAULTS: Record<
  NonNullable<SkeletonProps['variant']>,
  { width: string; height: string; borderRadius: string }
> = {
  text: {
    width: '100%',
    height: '1em',
    borderRadius: 'var(--radius-sm)',
  },
  circular: {
    width: '40px',
    height: '40px',
    borderRadius: '9999px',
  },
  rectangular: {
    width: '100%',
    height: '120px',
    borderRadius: 'var(--radius-md)',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
}: SkeletonProps): JSX.Element {
  const defaults = VARIANT_DEFAULTS[variant];

  const style: React.CSSProperties = {
    width: toCSSValue(width) ?? defaults.width,
    height: toCSSValue(height) ?? defaults.height,
    borderRadius: defaults.borderRadius,
    backgroundColor: 'var(--color-border-default)',
    display: 'block',
  };

  return (
    <span
      role="status"
      aria-label="Loading…"
      aria-busy="true"
      className={`skeleton-pulse ${className}`}
      style={style}
    />
  );
}

export default Skeleton;
