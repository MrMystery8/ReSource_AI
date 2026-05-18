import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Card } from './Card';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'error';

const TONE_STYLES: Record<Tone, CSSProperties> = {
  default: {
    backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
    borderColor: 'var(--color-border-subtle)',
  },
  primary: {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-primary) 26%, transparent)',
  },
  success: {
    backgroundColor: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-success) 26%, transparent)',
  },
  warning: {
    backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-warning) 26%, transparent)',
  },
  error: {
    backgroundColor: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-error) 26%, transparent)',
  },
};

export interface AnalysisCardProps {
  children: ReactNode;
  className?: string;
}

export function AnalysisCard({ children, className = '' }: AnalysisCardProps): JSX.Element {
  return (
    <Card
      elevation="md"
      className={`overflow-hidden transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border-default))] ${className}`}
    >
      {children}
    </Card>
  );
}

export interface TintedPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

export function TintedPanel({
  children,
  tone = 'default',
  className = '',
  ...rest
}: TintedPanelProps): JSX.Element {
  return (
    <div
      {...rest}
      className={`rounded-xl border ${className}`}
      style={{ ...TONE_STYLES[tone], ...rest.style }}
    >
      {children}
    </div>
  );
}

export interface StatusPillProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function StatusPill({
  children,
  tone = 'default',
  className = '',
}: StatusPillProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${className}`}
      style={TONE_STYLES[tone]}
    >
      {children}
    </span>
  );
}

export interface NumberedSectionHeadingProps {
  step: number;
  title: string;
  subtitle?: string;
}

export function NumberedSectionHeading({
  step,
  title,
  subtitle,
}: NumberedSectionHeadingProps): JSX.Element {
  return (
    <div className="mb-4">
      <h2
        className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
            color: 'var(--color-primary)',
          }}
        >
          {step}
        </span>
        {title}
      </h2>
      {subtitle ? (
        <p className="text-xs mt-1 ml-7" style={{ color: 'var(--color-text-muted)' }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
