import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Card } from './Card';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'error';

const TONE_STYLES: Record<Tone, CSSProperties> = {
  default: {
    backgroundColor: 'rgba(8, 18, 14, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  primary: {
    backgroundColor: 'rgba(8, 18, 14, 0.9)',
    borderColor: 'rgba(52, 211, 153, 0.26)',
  },
  success: {
    backgroundColor: 'rgba(12, 34, 25, 0.88)',
    borderColor: 'rgba(52, 211, 153, 0.28)',
  },
  warning: {
    backgroundColor: 'rgba(36, 26, 8, 0.88)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  error: {
    backgroundColor: 'rgba(46, 14, 18, 0.88)',
    borderColor: 'rgba(248, 113, 113, 0.34)',
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
      style={{ ...TONE_STYLES[tone], color: '#f7fffb' }}
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
        style={{ color: 'rgba(255, 255, 255, 0.78)' }}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
            color: '#34d399',
          }}
        >
          {step}
        </span>
        {title}
      </h2>
      {subtitle ? (
        <p className="text-xs mt-1 ml-7" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
