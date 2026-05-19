import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ProgressIndicatorProps {
  stageName: string;
}

export function ProgressIndicator({ stageName }: ProgressIndicatorProps) {
  return (
    <div
      className="p-5 rounded-xl border shadow-[var(--shadow-sm)]"
      style={{
        backgroundColor: 'rgba(7, 23, 18, 0.92)',
        borderColor: 'rgba(52, 211, 153, 0.24)',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Processing: ${stageName}`}
    >
      <div className="flex items-center gap-4">
        {/* Steady spinning loader — no bouncing bar */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        >
          <Loader2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
            Processing:{' '}
            <span style={{ color: 'rgba(255, 255, 255, 0.86)' }}>{stageName}</span>
          </p>

          {/* Shimmer track — steady left-to-right sweep, no bouncing */}
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(52, 211, 153, 1) 40%, rgba(110, 231, 183, 1) 60%, transparent 100%)',
                width: '50%',
              }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressIndicator;
