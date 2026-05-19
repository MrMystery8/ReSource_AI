import { motion } from 'framer-motion';
import { Leaf, Droplets, Award, Shield, Crown, Flame, Sparkles } from 'lucide-react';
import type { UserLevel } from '@resource-ai/shared';

export interface LevelBadgeProps {
  level: UserLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const LEVEL_CONFIG: Record<
  UserLevel,
  { color: string; glow: string; bg: string; border: string; icon: typeof Leaf }
> = {
  Recycler: {
    color: 'text-emerald-400',
    glow: 'shadow-emerald-400/40',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: Leaf,
  },
  'Eco-Sorter': {
    color: 'text-teal-400',
    glow: 'shadow-teal-400/40',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    icon: Droplets,
  },
  'Resource Salvager': {
    color: 'text-blue-400',
    glow: 'shadow-blue-400/40',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: Award,
  },
  'Triage Specialist': {
    color: 'text-indigo-400',
    glow: 'shadow-indigo-400/40',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: Shield,
  },
  'E-Waste Champion': {
    color: 'text-purple-400',
    glow: 'shadow-purple-400/40',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: Crown,
  },
  'Green Guardian': {
    color: 'text-amber-400',
    glow: 'shadow-amber-400/40',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: Flame,
  },
  'Eco-Legend': {
    color: 'text-rose-400',
    glow: 'shadow-rose-400/40',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: Sparkles,
  },
};

const SIZE_CONFIG = {
  sm: { container: 'px-2 py-0.5 text-xs gap-1', icon: 'w-3 h-3' },
  md: { container: 'px-3 py-1 text-sm gap-1.5', icon: 'w-4 h-4' },
  lg: { container: 'px-4 py-2 text-base gap-2', icon: 'w-5 h-5' },
};

export function LevelBadge({ level, size = 'md', showLabel = true }: LevelBadgeProps) {
  const config = LEVEL_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center ${sizeConfig.container} rounded-full font-semibold border shadow-lg ${config.bg} ${config.color} ${config.border} ${config.glow}`}
      role="status"
      aria-label={`Level: ${level}`}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{level}</span>}
    </motion.span>
  );
}

export default LevelBadge;
