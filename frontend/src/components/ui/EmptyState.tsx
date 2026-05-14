/**
 * EmptyState.tsx
 *
 * Displayed when a page or section has no data to show.
 *
 * Structure:
 *   - Illustrative icon (LucideIcon)
 *   - Title (single sentence explaining why no data is present)
 *   - Optional description (secondary context)
 *   - Optional CTA button directing the user to a relevant next step
 *
 * Validates: Requirements 8.2
 */

import React, { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Lucide icon component to render as the illustrative icon */
  icon: LucideIcon;
  /** Primary message — single sentence stating why no data is present */
  title: string;
  /** Optional secondary context */
  description?: string;
  /** Label for the CTA button */
  ctaLabel?: string;
  /** Handler for the CTA button */
  onCta?: () => void;
  /** Optional custom CTA element (overrides ctaLabel/onCta) */
  ctaElement?: ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  ctaElement,
  className = '',
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-16 px-6 text-center ${className}`}
      role="status"
    >
      {/* Illustrative icon */}
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          color: 'var(--color-text-muted)',
        }}
        aria-hidden="true"
      >
        <Icon size={32} strokeWidth={1.5} />
      </div>

      {/* Text content */}
      <div className="flex flex-col gap-1.5 max-w-sm">
        <p
          className="text-base font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </p>

        {description && (
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {description}
          </p>
        )}
      </div>

      {/* CTA */}
      {ctaElement ?? (ctaLabel && onCta ? (
        <Button variant="primary" size="md" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null)}
    </div>
  );
}

export default EmptyState;
