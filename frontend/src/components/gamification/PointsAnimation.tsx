import { motion, AnimatePresence } from 'framer-motion';

export interface PointsAnimationProps {
  points: number;
  visible: boolean;
  onComplete?: () => void;
}

export function PointsAnimation({ points, visible, onComplete }: PointsAnimationProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.6 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          onAnimationComplete={(definition) => {
            // Call onComplete after the exit animation
            if (definition === 'exit' || (typeof definition === 'object' && 'opacity' in definition && definition.opacity === 0)) {
              onComplete?.();
            }
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          role="status"
          aria-live="polite"
          aria-label={`Earned ${points} points`}
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, times: [0, 0.6, 1] }}
            className="text-center"
          >
            <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
              +{points}
            </span>
            <p className="text-sm sm:text-base text-emerald-300/80 font-medium mt-1">
              points earned!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PointsAnimation;
