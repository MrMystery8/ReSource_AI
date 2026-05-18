import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_WHITE,
} from './analysisTheme';

export interface SkeletonStageProps {
  label: string;
}

/**
 * Wireframe-style skeleton placeholder shown while a pipeline stage
 * is still being processed. Gives users visual feedback that content
 * is on its way.
 */
export function SkeletonStage({ label }: SkeletonStageProps) {
  return (
    <Card surface="neon" elevation="sm" className="p-6 space-y-4 opacity-70">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: ANALYSIS_EMERALD }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-sm font-medium" style={{ color: ANALYSIS_WHITE }}>{label}</span>
        </div>
        <span className="text-xs italic" style={{ color: ANALYSIS_EMERALD }}>Pending...</span>
      </div>

      {/* Content skeleton lines */}
      <div className="space-y-3">
        <SkeletonLine width="75%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="60%" />
        <SkeletonLine width="80%" />
      </div>

      {/* Dashed border wireframe effect */}
      <div
        className="rounded-lg border border-dashed p-4 mt-2"
        style={{ borderColor: 'rgba(52, 211, 153, 0.24)' }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-4 h-4 rounded border border-dashed"
            style={{ borderColor: 'rgba(52, 211, 153, 0.34)' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs" style={{ color: ANALYSIS_BODY_WHITE }}>
            Waiting for AI analysis...
          </span>
        </div>
      </div>
    </Card>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <motion.div
      className="h-3 rounded-full"
      style={{ width, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default SkeletonStage;
