/**
 * Card.tsx
 *
 * Surface container with solid background, configurable elevation, and
 * consistent border-radius (lg: 12px) from the design system scale.
 *
 * Validates: Requirements 7.3, 5.4
 */

import React, { type HTMLAttributes, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevation?: 'sm' | 'md' | 'lg';
  surface?: 'solid' | 'analysis';
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
  surface = 'solid',
  className = '',
  style,
  ...rest
}: CardProps): JSX.Element {
  const surfaceStyle: React.CSSProperties =
    surface === 'analysis'
      ? {
          backgroundColor: 'rgba(7, 23, 18, 0.92)',
          borderColor: 'rgba(52, 211, 153, 0.24)',
          boxShadow: [
            ELEVATION_STYLES[elevation].boxShadow,
            'inset 0 0 0 1px rgba(52, 211, 153, 0.08)',
          ].join(', '),
        }
      : {
          backgroundColor: 'var(--color-surface-card)',
          borderColor: 'var(--color-border-default)',
          ...ELEVATION_STYLES[elevation],
        };

  return (
    <div
      {...rest}
      className={`rounded-xl border ${className}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        ...surfaceStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
