import { motion } from 'framer-motion';
import type { SafetyGateOutput } from '@resource-ai/shared';
import { Shield, AlertOctagon, CheckCircle2, XCircle, StopCircle, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_WHITE,
} from '../analysisTheme';

interface Props {
  data: SafetyGateOutput;
}

export function SafetyGateCard({ data }: Props) {
  return (
    <Card surface="neon" elevation="md" className="overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
            }}
          >
            <Shield className="w-5 h-5" style={{ color: ANALYSIS_WHITE }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: ANALYSIS_EMERALD }}>Safety Gate</h3>
        </div>
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
                  <span className="text-sm" style={{ color: ANALYSIS_BODY_WHITE }}>{item}</span>
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
                  <span className="text-sm" style={{ color: ANALYSIS_BODY_WHITE }}>{action}</span>
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
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.16)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <StopCircle className="w-4 h-4" style={{ color: ANALYSIS_WHITE }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: ANALYSIS_WHITE }}>
                Stop If...
              </span>
            </div>
            <ul className="space-y-2">
              {data.stopConditions.map((condition, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StopCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  <span className="text-sm" style={{ color: ANALYSIS_BODY_WHITE }}>{condition}</span>
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
              <p className="text-sm leading-relaxed" style={{ color: ANALYSIS_BODY_WHITE }}>
                {data.recommendedSafeNextStep}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Card>
  );
}
