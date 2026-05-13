import { motion, AnimatePresence } from 'framer-motion';
import type { BadgeInfo } from '@resource-ai/shared';

export interface BadgeUnlockToastProps {
  badge: BadgeInfo;
  visible: boolean;
  onDismiss?: () => void;
}

/**
 * A fixed-position toast notification shown when a user earns a new badge.
 * Slides in from the right, auto-dismisses after 5 seconds.
 */
export function BadgeUnlockToast({ badge, visible, onDismiss }: BadgeUnlockToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm"
          role="alert"
          aria-live="assertive"
          aria-label={`Badge unlocked: ${badge.name}`}
        >
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-surface-800/95 backdrop-blur-xl border border-amber-500/30 shadow-xl shadow-amber-500/10">
            {/* Badge Icon */}
            <motion.div
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, times: [0, 0.5, 1] }}
              className="text-3xl flex-shrink-0"
              aria-hidden="true"
            >
              {badge.icon}
            </motion.div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Badge Unlocked!
              </p>
              <p className="text-sm font-bold text-white truncate mt-0.5">
                {badge.name}
              </p>
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                {badge.description}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-md text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BadgeUnlockToast;
