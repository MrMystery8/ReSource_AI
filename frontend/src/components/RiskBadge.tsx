import { motion } from 'framer-motion';
import type { RiskLevel } from '@resource-ai/shared';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface RiskBadgeProps {
  level: RiskLevel;
  compact?: boolean;
}

// Map risk levels to semantic badge token sets.
// Green/Yellow use success/warning tokens; Orange/Red use warning/error tokens.
// All pairs meet WCAG AA 4.5:1 contrast in both light and dark themes.
const RISK_CONFIG: Record<
  RiskLevel,
  { fgVar: string; bgVar: string; borderVar: string; icon: React.ReactNode; dotClass: string }
> = {
  Green: {
    fgVar: 'var(--badge-success-fg)',
    bgVar: 'var(--badge-success-bg)',
    borderVar: 'var(--badge-success-border)',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    dotClass: 'bg-emerald-400',
  },
  Yellow: {
    fgVar: 'var(--badge-warning-fg)',
    bgVar: 'var(--badge-warning-bg)',
    borderVar: 'var(--badge-warning-border)',
    icon: <Shield className="w-3.5 h-3.5" />,
    dotClass: 'bg-amber-400',
  },
  Orange: {
    fgVar: 'var(--badge-warning-fg)',
    bgVar: 'var(--badge-warning-bg)',
    borderVar: 'var(--badge-warning-border)',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    dotClass: 'bg-orange-400',
  },
  Red: {
    fgVar: 'var(--badge-error-fg)',
    bgVar: 'var(--badge-error-bg)',
    borderVar: 'var(--badge-error-border)',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    dotClass: 'bg-rose-400',
  },
};

export function RiskBadge({ level, compact = false }: RiskBadgeProps) {
  const config = RISK_CONFIG[level];

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={compact
        ? 'inline-flex items-center justify-center'
        : 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold'}
      style={{
        color: config.fgVar,
        backgroundColor: compact ? 'transparent' : config.bgVar,
        border: compact ? '1px solid transparent' : `1px solid ${config.borderVar}`,
      }}
      role="status"
      aria-label={`Risk level: ${level}`}
    >
      {compact ? (
        <>
          <span
            className={`inline-block w-2 h-2 rounded-full ${config.dotClass}`}
            aria-hidden="true"
            title={`Risk level: ${level}`}
          />
          <span className="sr-only">{level}</span>
        </>
      ) : (
        <>
          {config.icon}
          {level}
        </>
      )}
    </motion.span>
  );
}

export default RiskBadge;
