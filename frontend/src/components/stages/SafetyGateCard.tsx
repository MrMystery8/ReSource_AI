import { motion } from 'framer-motion';
import type { SafetyGateOutput } from '@resource-ai/shared';
import { Shield, AlertOctagon, CheckCircle2, XCircle, StopCircle } from 'lucide-react';

interface Props {
  data: SafetyGateOutput;
}

export function SafetyGateCard({ data }: Props) {
  const combinedUnsafeItems = [
    ...data.identifiedHazards.map((hazard) => `Hazard: ${hazard}`),
    ...data.doNotPerform.map((action) => `Avoid: ${action}`),
  ];

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-colors">
      {/* Header */}
      <div className="p-6 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Safety Gate</h3>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Stop Conditions */}
        {data.stopConditions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <StopCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Stop If...</span>
            </div>
            <ul className="space-y-2">
              {data.stopConditions.map((condition, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StopCircle className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary">{condition}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Safety Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Hazards + Do Not Perform</span>
            </div>
            <ul className="space-y-2">
              {combinedUnsafeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-400/70 mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary">{item}</span>
                </li>
              ))}
              {combinedUnsafeItems.length === 0 && (
                <li className="text-sm text-text-muted">No explicit unsafe actions were identified.</li>
              )}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Safe Actions</span>
            </div>
            <ul className="space-y-2">
              {data.safeActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary">{action}</span>
                </li>
              ))}
              {data.safeActions.length === 0 && (
                <li className="text-sm text-text-muted">No specific safe actions were returned.</li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
