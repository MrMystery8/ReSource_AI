import { motion } from 'framer-motion';
import type { UserLevel } from '@resource-ai/shared';
import { LEVEL_THRESHOLDS } from '@resource-ai/shared';

export interface ProgressBarProps {
  points: number;
  level: UserLevel;
  nextLevel: UserLevel | null;
  pointsToNextLevel: number;
}

const LEVEL_ACCENT: Record<UserLevel, string> = {
  Recycler:            '#10b981',
  'Eco-Sorter':        '#14b8a6',
  'Resource Salvager': '#3b82f6',
  'Triage Specialist': '#6366f1',
  'E-Waste Champion':  '#a855f7',
  'Green Guardian':    '#f59e0b',
  'Eco-Legend':        '#ef4444',
};

export function ProgressBar({ points, level, nextLevel, pointsToNextLevel }: ProgressBarProps) {
  // Calculate progress percentage within current level
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  const minPoints = currentThreshold?.minPoints ?? 0;
  const maxPoints = currentThreshold?.maxPoints ?? Infinity;
  const accent = LEVEL_ACCENT[level];

  let progress: number;
  if (maxPoints === Infinity) {
    progress = 100;
  } else {
    const levelRange = maxPoints - minPoints + 1;
    const pointsInLevel = points - minPoints;
    progress = Math.min(100, Math.max(0, (pointsInLevel / levelRange) * 100));
  }

  return (
    <div className="w-full" role="progressbar" aria-valuenow={points} aria-label={`Progress toward ${nextLevel ?? 'max level'}`}>
      {/* Labels */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: accent }}>
          {level}
        </span>
        {nextLevel ? (
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {nextLevel}
          </span>
        ) : (
          <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
            Max Level!
          </span>
        )}
      </div>

      {/* Bar */}
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--color-surface-card))` }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* Points info */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
          {points.toLocaleString()} pts
        </span>
        {nextLevel && (
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            {pointsToNextLevel.toLocaleString()} pts to go
          </span>
        )}
      </div>
    </div>
  );
}

export default ProgressBar;

