/**
 * Card.tsx
 *
 * Surface container with configurable elevation and surface treatment.
 * The default card is solid; alternate surfaces support premium panels
 * layered over animated backgrounds.
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
  surface?: 'solid' | 'glass' | 'neon';
  className?: string;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const ELEVATION_SHADOWS: Record<NonNullable<CardProps['elevation']>, string> = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({
  children,
  elevation = 'md',
  surface = 'solid',
  className = '',
  ...props
}: CardProps): JSX.Element {
  const shadow = ELEVATION_SHADOWS[elevation];
  const surfaceStyle: React.CSSProperties =
    surface === 'glass'
      ? {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'rgba(15, 15, 18, 0.50)',
          borderColor: 'rgba(255, 255, 255, 0.10)',
          backdropFilter: 'blur(20px) saturate(135%)',
          WebkitBackdropFilter: 'blur(20px) saturate(135%)',
          boxShadow: [
            shadow,
            '0 0 0 1px rgba(255, 255, 255, 0.04)',
            '0 24px 72px rgba(0, 0, 0, 0.34)',
            'inset 0 1px 0 rgba(255, 255, 255, 0.10)',
            'inset 0 -1px 0 rgba(255, 255, 255, 0.03)',
          ].join(', '),
        }
      : {
          backgroundColor: 'var(--color-surface-card)',
          borderColor: 'var(--color-border-default)',
          boxShadow: shadow,
        };
  const neonStyle: React.CSSProperties =
    surface === 'neon'
      ? {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000000',
          borderColor: 'rgba(52, 211, 153, 0.78)',
          borderWidth: '2px',
          transform: 'translateY(-4px)',
          boxShadow: [
            shadow,
            '0 0 0 2px rgba(52, 211, 153, 0.5)',
            '0 0 20px rgba(52, 211, 153, 0.45)',
            '0 0 42px rgba(52, 211, 153, 0.3)',
            '0 0 78px rgba(20, 184, 166, 0.24)',
            '0 18px 40px rgba(0, 0, 0, 0.34)',
            '0 40px 110px rgba(0, 0, 0, 0.62)',
            'inset 0 0 18px rgba(52, 211, 153, 0.08)',
            'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
          ].join(', '),
        }
      : {};

  return (
    <div
      {...props}
      className={`rounded-xl border ${className}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        ...(surface === 'neon' ? neonStyle : surfaceStyle),
        ...props.style,
      }}
    >
      {surface === 'glass' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 18%, rgba(255, 255, 255, 0.015) 42%, rgba(255, 255, 255, 0) 100%)',
              'radial-gradient(circle at 88% 0%, rgba(255, 255, 255, 0.08), transparent 24%)',
              'radial-gradient(circle at 12% 8%, rgba(255, 255, 255, 0.05), transparent 22%)',
            ].join(', '),
          }}
        />
      )}
      {surface === 'neon' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 24%, rgba(255, 255, 255, 0) 100%)',
              'radial-gradient(circle at top left, rgba(52, 211, 153, 0.10), transparent 26%)',
              'radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.08), transparent 24%)',
            ].join(', '),
          }}
        />
      )}
      <div className={surface === 'glass' || surface === 'neon' ? 'relative z-10' : undefined}>
        {children}
      </div>
    </div>
  );
}

export default Card;
