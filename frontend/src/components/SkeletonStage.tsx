import { motion } from 'framer-motion';

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
    <div className="glass-card p-6 space-y-4 opacity-60">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-2 h-2 rounded-full bg-text-muted"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-sm font-medium text-text-muted">{label}</span>
        </div>
        <span className="text-xs text-text-muted italic">Pending...</span>
      </div>

      {/* Content skeleton lines */}
      <div className="space-y-3">
        <SkeletonLine width="75%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="60%" />
        <SkeletonLine width="80%" />
      </div>

      {/* Dashed border wireframe effect */}
      <div className="border border-dashed border-border-subtle rounded-lg p-4 mt-2">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-4 h-4 rounded border border-dashed border-text-muted"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-text-muted">Waiting for AI analysis...</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <motion.div
      className="h-3 rounded-full bg-surface-elevated"
      style={{ width }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default SkeletonStage;
