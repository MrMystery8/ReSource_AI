import { motion } from 'framer-motion';
import type { NextStepsOutput } from '@resource-ai/shared';
import { Route, CheckCircle2, Package, Ban, AlertTriangle, MapPin, Trash2 } from 'lucide-react';

interface Props {
  data: NextStepsOutput;
}

export function NextStepsCard({ data }: Props) {
  return (
    <div className="glass-card glass-card-hover overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
          <Route className="w-5 h-5 text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Safe Next Steps & Recovery Route</h3>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Overall Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-emerald-500/5 border border-primary-500/20"
        >
          <span className="text-xs font-semibold text-primary-300 uppercase tracking-wide block mb-1">Overall Recommendation</span>
          <p className="text-sm text-text-primary leading-relaxed">{data.overallRecommendation}</p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Safe First Actions */}
          {data.safeFirstActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Safe First Actions</span>
              </div>
              <ol className="space-y-2">
                {data.safeFirstActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-400">{i + 1}</span>
                    </span>
                    <span className="text-xs text-text-secondary leading-relaxed">{action}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}

          {/* Parts To Keep / Avoid */}
          <div className="space-y-3">
            {data.partsToKeep.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-xl bg-surface-elevated/50 border border-border-subtle"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Parts to Keep</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.partsToKeep.map((part, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium">
                      {part}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {data.partsToAvoid.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl bg-surface-elevated/50 border border-border-subtle"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Parts to Avoid</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.partsToAvoid.map((part, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 font-medium">
                      {part}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Hazard Warnings */}
        {data.hazardWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Hazard Warnings</span>
            </div>
            <div className="space-y-2">
              {data.hazardWarnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
                  <span className="text-xs text-text-secondary">
                    <span className="font-medium text-amber-300">{warning.component}</span> — {warning.risk}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bottom Row: Trash Warnings + Local Recovery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.trashWarnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl bg-surface-elevated/50 border border-border-subtle"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-text-muted" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Disposal Notes</span>
              </div>
              <ul className="space-y-1.5">
                {data.trashWarnings.map((warning, i) => (
                  <li key={i} className="text-xs text-text-secondary leading-relaxed">{warning}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {data.localRecoveryNote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-4 rounded-xl bg-surface-elevated/50 border border-border-subtle"
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-text-muted" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Local Recovery</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{data.localRecoveryNote}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
