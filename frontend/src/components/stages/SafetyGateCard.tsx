import { motion } from 'framer-motion';
import type { SafetyGateOutput, RiskLevel } from '@resource-ai/shared';
import { RiskBadge } from '../RiskBadge';
import { Shield, AlertOctagon, CheckCircle2, XCircle, StopCircle, ArrowRight } from 'lucide-react';

interface Props {
  data: SafetyGateOutput;
}

export function SafetyGateCard({ data }: Props) {
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
        <RiskBadge level={data.riskLevel as RiskLevel} compact />
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Identified Hazards */}
        {data.identifiedHazards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Identified Hazards</span>
            </div>
            <ul className="space-y-2">
              {data.identifiedHazards.map((hazard, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span className="text-sm text-rose-200/90">{hazard}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Do Not Perform */}
        {data.doNotPerform.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15"
          >
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Do Not Perform</span>
            </div>
            <ul className="space-y-2">
              {data.doNotPerform.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-400/70 mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Safe Actions */}
        {data.safeActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
            </ul>
          </motion.div>
        )}

        {/* Stop Conditions */}
        {data.stopConditions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
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

        {/* Recommended Next Step */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20"
        >
          <div className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-primary-300 uppercase tracking-wide block mb-1">Recommended Safe Next Step</span>
              <p className="text-sm text-text-primary leading-relaxed">{data.recommendedSafeNextStep}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
