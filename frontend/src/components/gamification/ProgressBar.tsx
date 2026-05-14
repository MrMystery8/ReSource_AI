import { motion } from 'framer-motion';
import type { UserLevel } from '@resource-ai/shared';
import { LEVEL_THRESHOLDS } from '@resource-ai/shared';

export interface ProgressBarProps {
  points: number;
  level: UserLevel;
  nextLevel: UserLevel | null;
  pointsToNextLevel: number;
}

const LEVEL_GRADIENT: Record<UserLevel, string> = {
  Recycler: 'from-emerald-500 to-emerald-300',
  Salvager: 'from-blue-500 to-blue-300',
  'E-Waste Champion': 'from-purple-500 to-purple-300',
  'Green Guardian': 'from-amber-500 to-amber-300',
};

const LEVEL_BG: Record<UserLevel, string> = {
  Recycler: 'bg-emerald-500/20',
  Salvager: 'bg-blue-500/20',
  'E-Waste Champion': 'bg-purple-500/20',
  'Green Guardian': 'bg-amber-500/20',
};

export function ProgressBar({ points, level, nextLevel, pointsToNextLevel }: ProgressBarProps) {
  // Calculate progress percentage within current level
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  const minPoints = currentThreshold?.minPoints ?? 0;
  const maxPoints = currentThreshold?.maxPoints ?? Infinity;

  let progress: number;
  if (maxPoints === Infinity) {
    // Max level reached
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
        <span className="text-xs font-medium text-text-secondary">
          {level}
        </span>
        {nextLevel ? (
          <span className="text-xs font-medium text-text-secondary">
            {nextLevel}
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-400">
            Max Level!
          </span>
        )}
      </div>

      {/* Bar */}
      <div className={`relative h-3 rounded-full overflow-hidden ${LEVEL_BG[level]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${LEVEL_GRADIENT[level]}`}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-80px', '400px'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      </div>

      {/* Points info */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-text-secondary">
          {points.toLocaleString()} pts
        </span>
        {nextLevel && (
          <span className="text-xs text-text-secondary">
            {pointsToNextLevel.toLocaleString()} pts to go
          </span>
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
