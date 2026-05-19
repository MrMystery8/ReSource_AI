import { motion } from 'framer-motion';
import type { NextStepsOutput } from '@resource-ai/shared';
import { Route, MapPin, Trash2 } from 'lucide-react';

interface Props {
  data: NextStepsOutput;
}

export function NextStepsCard({ data }: Props) {
  return (
    <div className="overflow-hidden rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-colors">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
          <Route className="w-5 h-5 text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Safe Next Steps & Recovery Route</h3>
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Disposal Notes</span>
            </div>
            <p className="mb-2 text-xs text-text-muted leading-relaxed">
              Dispose through certified e-waste streams only. Do not place hazardous components in household trash.
            </p>
            <ul className="space-y-1.5">
              {data.trashWarnings.length > 0 ? data.trashWarnings.map((warning, i) => (
                <li key={i} className="text-xs text-text-secondary leading-relaxed">{warning}</li>
              )) : (
                <li className="text-xs text-text-muted leading-relaxed">Use approved e-waste collection channels for all disposal.</li>
              )}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-primary-500/6 border border-primary-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary-300" />
              <span className="text-xs font-semibold text-primary-300 uppercase tracking-wide">Local Recovery</span>
            </div>
            <p className="mb-2 text-xs text-text-muted leading-relaxed">
              Prioritize official municipal drop-off points, certified refurbishers, or authorized electronics recyclers in your area.
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {data.localRecoveryNote || 'Check your city or municipality recycling directory for certified collection partners.'}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
