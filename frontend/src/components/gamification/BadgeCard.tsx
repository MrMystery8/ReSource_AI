import { motion } from 'framer-motion';
import type { BadgeInfo } from '@resource-ai/shared';

export interface BadgeCardProps {
  badge: BadgeInfo;
}

export function BadgeCard({ badge }: BadgeCardProps) {
  const isEarned = badge.earnedAt !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isEarned ? { scale: 1.05, y: -2 } : undefined}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border backdrop-blur-sm transition-colors ${
        isEarned
          ? 'bg-white/5 border-white/10 shadow-lg'
          : 'bg-white/[0.02] border-white/5 opacity-50 grayscale'
      }`}
      role="article"
      aria-label={`${badge.name} badge${isEarned ? ', earned' : ', not yet earned'}`}
    >
      {/* Badge Icon */}
      <div
        className={`text-3xl ${isEarned ? '' : 'opacity-40'}`}
        aria-hidden="true"
      >
        {badge.icon}
      </div>

      {/* Badge Name */}
      <h3
        className={`text-sm font-semibold text-center ${
          isEarned ? 'text-white' : 'text-text-secondary'
        }`}
      >
        {badge.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-text-secondary text-center leading-relaxed">
        {badge.description}
      </p>

      {/* Earned Date */}
      {isEarned && badge.earnedAt && (
        <span className="text-[10px] text-emerald-400/70 font-medium mt-1">
          Earned {new Date(badge.earnedAt).toLocaleDateString()}
        </span>
      )}

      {/* Glow effect for earned badges */}
      {isEarned && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
}

export default BadgeCard;
