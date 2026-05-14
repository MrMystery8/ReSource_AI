import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export interface StreakIndicatorProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { container: 'px-2 py-0.5 text-xs gap-1', icon: 'w-3 h-3' },
  md: { container: 'px-3 py-1 text-sm gap-1.5', icon: 'w-4 h-4' },
  lg: { container: 'px-4 py-2 text-base gap-2', icon: 'w-5 h-5' },
};

export function StreakIndicator({ streak, size = 'md' }: StreakIndicatorProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const isActive = streak > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center ${sizeConfig.container} rounded-full font-semibold border ${
        isActive
          ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
          : 'bg-stone-100 text-text-secondary border-border-default'
      }`}
      role="status"
      aria-label={`${streak} week streak${isActive ? ', active' : ''}`}
    >
      <motion.div
        animate={
          isActive
            ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }
            : undefined
        }
        transition={
          isActive
            ? { duration: 1.5, repeat: Infinity, repeatDelay: 2 }
            : undefined
        }
      >
        <Flame className={sizeConfig.icon} />
      </motion.div>
      <span>{streak}</span>
    </motion.div>
  );
}

export default StreakIndicator;
