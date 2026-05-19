import { motion } from 'framer-motion';
import { Leaf, Droplets, Award, Shield, Crown, Flame, Sparkles } from 'lucide-react';
import type { UserLevel } from '@resource-ai/shared';

export interface LevelBadgeProps {
  level: UserLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Each level maps to an accent HSL used for text, border tint, and background tint.
 * We use a single accent color per level and derive everything from it, which keeps
 * the palette harmonious and avoids the "rainbow utility soup" problem.
 */
const LEVEL_CONFIG: Record<
  UserLevel,
  { accent: string; icon: typeof Leaf }
> = {
  Recycler:            { accent: '#10b981', icon: Leaf },
  'Eco-Sorter':        { accent: '#14b8a6', icon: Droplets },
  'Resource Salvager': { accent: '#3b82f6', icon: Award },
  'Triage Specialist': { accent: '#6366f1', icon: Shield },
  'E-Waste Champion':  { accent: '#a855f7', icon: Crown },
  'Green Guardian':    { accent: '#f59e0b', icon: Flame },
  'Eco-Legend':        { accent: '#ef4444', icon: Sparkles },
};

const SIZE_CONFIG = {
  sm: { container: 'px-2 py-0.5 text-xs gap-1', icon: 'w-3 h-3' },
  md: { container: 'px-3 py-1 text-sm gap-1.5', icon: 'w-4 h-4' },
  lg: { container: 'px-4 py-1.5 text-base gap-2', icon: 'w-5 h-5' },
};

export function LevelBadge({ level, size = 'md', showLabel = true }: LevelBadgeProps) {
  const config = LEVEL_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center ${sizeConfig.container} rounded-full font-semibold border`}
      style={{
        color: config.accent,
        backgroundColor: `color-mix(in srgb, ${config.accent} 8%, var(--color-surface-elevated))`,
        borderColor: `color-mix(in srgb, ${config.accent} 25%, transparent)`,
      }}
      role="status"
      aria-label={`Level: ${level}`}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{level}</span>}
    </motion.span>
  );
}

export default LevelBadge;

