import { motion } from 'framer-motion';
import type { RiskLevel } from '@resource-ai/shared';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface RiskBadgeProps {
  level: RiskLevel;
}

const RISK_CONFIG: Record<RiskLevel, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Green: {
    bg: 'bg-success-50',
    text: 'text-success-500',
    border: 'border-success-100',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  Yellow: {
    bg: 'bg-warning-50',
    text: 'text-warning-500',
    border: 'border-warning-100',
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  Orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
  Red: {
    bg: 'bg-danger-50',
    text: 'text-danger-500',
    border: 'border-danger-100',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const config = RISK_CONFIG[level];

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
      role="status"
      aria-label={`Risk level: ${level}`}
    >
      {config.icon}
      {level}
    </motion.span>
  );
}

export default RiskBadge;
