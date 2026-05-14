import { motion } from 'framer-motion';
import type { QuickVerdictOutput, RiskLevel } from '@resource-ai/shared';
import { RiskBadge } from '../RiskBadge';
import { Gauge, Cpu, Lightbulb, AlertTriangle, Info } from 'lucide-react';

interface Props {
  data: QuickVerdictOutput;
}

function getSalvageColor(score: number): string {
  if (score >= 4) return 'text-success-500';
  if (score >= 3) return 'text-warning-500';
  return 'text-danger-500';
}

function getSalvageBg(score: number): string {
  if (score >= 4) return 'from-emerald-500/20 to-emerald-500/5';
  if (score >= 3) return 'from-amber-500/20 to-amber-500/5';
  return 'from-rose-500/20 to-rose-500/5';
}

function getConfidenceLabel(confidence: string): { label: string; color: string } {
  switch (confidence) {
    case 'high': return { label: 'High Confidence', color: 'text-success-500' };
    case 'moderate': return { label: 'Moderate Confidence', color: 'text-warning-500' };
    default: return { label: 'Low Confidence', color: 'text-danger-500' };
  }
}

export function QuickVerdictCard({ data }: Props) {
  const conf = getConfidenceLabel(data.confidence);

  return (
    <div className="card card-hover overflow-hidden">
      {/* Header with device name and risk */}
      <div className="p-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">Quick ReSource Verdict</h3>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-text-secondary">{data.deviceIdentification}</span>
            <span className={`text-xs ${conf.color}`}>• {conf.label}</span>
          </div>
        </div>
        <RiskBadge level={data.riskLevel as RiskLevel} />
      </div>

      {/* Key Metrics Row */}
      <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Salvage Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl p-4 bg-gradient-to-br ${getSalvageBg(data.salvageScore)} border border-border-subtle`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wide">Salvage Score</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${getSalvageColor(data.salvageScore)}`}>
              {data.salvageScore}
            </span>
            <span className="text-xs text-text-muted">/5</span>
          </div>
        </motion.div>

        {/* Best Next Step */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-4 bg-primary-50 border border-border-subtle sm:col-span-2"
        >
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-text-muted uppercase tracking-wide">Recommended Next Step</span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">{data.bestNextStep}</p>
        </motion.div>
      </div>

      {/* Reusable Resources */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-muted uppercase tracking-wide">Top Reusable Resources</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.topReusableResources.map((resource, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-text-primary font-medium"
            >
              {resource}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Safety Warning */}
      {data.safetyWarning && (
        <div className="mx-6 mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
            <p className="text-xs text-warning-600/90 leading-relaxed">{data.safetyWarning}</p>
          </div>
        </div>
      )}

      {/* Missing Info */}
      {data.missingInfoNotes && (
        <div className="mx-6 mb-6 p-3 rounded-lg bg-stone-50 border border-border-subtle">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">{data.missingInfoNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
