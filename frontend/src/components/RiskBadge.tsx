import { motion } from 'framer-motion';
import type { RiskLevel } from '@resource-ai/shared';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface RiskBadgeProps {
  level: RiskLevel;
}

const RISK_CONFIG: Record<RiskLevel, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  Yellow: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  Orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
  Red: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
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
