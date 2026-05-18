import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card } from './ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_EMERALD_GLOW,
  ANALYSIS_WHITE,
} from './analysisTheme';

export interface ProgressIndicatorProps {
  stageName: string;
}

export function ProgressIndicator({ stageName }: ProgressIndicatorProps) {
  return (
    <Card
      surface="neon"
      elevation="sm"
      className="p-5"
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
          <Loader2 className="w-5 h-5" style={{ color: ANALYSIS_EMERALD }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: ANALYSIS_WHITE }}>
            Processing:{' '}
            <span style={{ color: ANALYSIS_EMERALD, textShadow: ANALYSIS_EMERALD_GLOW }}>{stageName}</span>
          </p>

          {/* Shimmer track — steady left-to-right sweep, no bouncing */}
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(52, 211, 153, 0.92) 40%, rgba(110, 231, 183, 1) 60%, transparent 100%)',
                boxShadow: '0 0 14px rgba(52, 211, 153, 0.28)',
                width: '50%',
              }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="mt-2 text-xs" style={{ color: ANALYSIS_BODY_WHITE }}>
            The analysis stages are updating live as each result completes.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default ProgressIndicator;
