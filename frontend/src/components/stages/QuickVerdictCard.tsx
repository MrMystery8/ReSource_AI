import { motion } from 'framer-motion';
import type { QuickVerdictOutput } from '@resource-ai/shared';
import { Gauge, Cpu, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_EMERALD_GLOW,
  ANALYSIS_MUTED_WHITE,
  ANALYSIS_SOFT_SURFACE,
  ANALYSIS_WHITE,
} from '../analysisTheme';

interface Props {
  data: QuickVerdictOutput;
}

function getSalvageColor(score: number): string {
  if (score >= 4) return 'text-emerald-400';
  if (score >= 3) return 'text-white';
  return 'text-rose-400';
}

function getSalvageBg(score: number): string {
  if (score >= 4) return 'from-emerald-500/20 to-emerald-500/5';
  if (score >= 3) return 'from-white/10 to-white/5';
  return 'from-rose-500/20 to-rose-500/5';
}

export function QuickVerdictCard({ data }: Props) {
  return (
    <Card surface="neon" elevation="md" className="overflow-hidden">
      <div className="p-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: ANALYSIS_EMERALD }}>
            Quick ReSource Verdict
          </h3>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" style={{ color: ANALYSIS_WHITE }} />
            <span className="text-sm" style={{ color: ANALYSIS_BODY_WHITE }}>{data.deviceIdentification}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Salvage Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl border p-4 bg-gradient-to-br ${getSalvageBg(data.salvageScore)}`}
          style={{ borderColor: 'rgba(52, 211, 153, 0.22)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4" style={{ color: ANALYSIS_WHITE }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: ANALYSIS_MUTED_WHITE }}>Salvage Score</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${getSalvageColor(data.salvageScore)}`}>
              {data.salvageScore}
            </span>
            <span className="text-xs" style={{ color: ANALYSIS_MUTED_WHITE }}>/5</span>
          </div>
        </motion.div>

        {/* Best Next Step */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border p-4 bg-gradient-to-br from-primary-500/10 to-primary-500/5 sm:col-span-2"
          style={{ borderColor: 'rgba(52, 211, 153, 0.22)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4" style={{ color: ANALYSIS_WHITE }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: ANALYSIS_MUTED_WHITE }}>
              Recommended Next Step
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: ANALYSIS_BODY_WHITE }}>{data.bestNextStep}</p>
        </motion.div>
      </div>

      {/* Reusable Resources */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: ANALYSIS_EMERALD, textShadow: ANALYSIS_EMERALD_GLOW }}>
            Top Reusable Resources
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.topReusableResources.map((resource, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              style={{
                backgroundColor: ANALYSIS_SOFT_SURFACE,
                borderColor: 'rgba(52, 211, 153, 0.22)',
                color: ANALYSIS_BODY_WHITE,
              }}
            >
              {resource}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Safety Warning */}
      {data.safetyWarning && (
        <div
          className="mx-6 mb-4 p-3 rounded-lg border"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.16)',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ANALYSIS_WHITE }} />
            <p className="text-xs leading-relaxed" style={{ color: ANALYSIS_BODY_WHITE }}>{data.safetyWarning}</p>
          </div>
        </div>
      )}

      {/* Missing Info */}
      {data.missingInfoNotes && (
        <div
          className="mx-6 mb-6 p-3 rounded-lg border"
          style={{
            backgroundColor: 'rgba(8, 18, 14, 0.78)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ANALYSIS_WHITE }} />
            <p className="text-xs leading-relaxed" style={{ color: ANALYSIS_MUTED_WHITE }}>{data.missingInfoNotes}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
