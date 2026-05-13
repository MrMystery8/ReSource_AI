import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ProgressIndicatorProps {
  stageName: string;
}

export function ProgressIndicator({ stageName }: ProgressIndicatorProps) {
  return (
    <div className="glass-card p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-5 h-5 text-primary-400" />
        </motion.div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">Processing: {stageName}</p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-400"
              initial={{ width: '0%' }}
              animate={{ width: ['0%', '70%', '40%', '90%', '60%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressIndicator;
