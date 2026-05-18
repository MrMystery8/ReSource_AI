/**
 * Card.tsx
 *
 * Surface container with solid background, configurable elevation, and
 * consistent border-radius (lg: 12px) from the design system scale.
 *
 * Validates: Requirements 7.3, 5.4
 */

import React, { type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardProps {
  children: ReactNode;
  elevation?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const ELEVATION_STYLES: Record<NonNullable<CardProps['elevation']>, React.CSSProperties> = {
  sm: { boxShadow: 'var(--shadow-sm)' },
  md: { boxShadow: 'var(--shadow-md)' },
  lg: { boxShadow: 'var(--shadow-lg)' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({
  children,
  elevation = 'md',
  className = '',
}: CardProps): JSX.Element {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-card)',
        borderColor: 'var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        ...ELEVATION_STYLES[elevation],
      }}
    >
      {children}
    </div>
  );
}

export default Card;
