import { motion } from 'framer-motion';
import type { DetailedAnalysisOutput, ComponentEntry } from '@resource-ai/shared';
import { Cpu, Activity, Stethoscope, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_MUTED_WHITE,
  ANALYSIS_SOFT_SURFACE,
  ANALYSIS_WHITE,
} from '../analysisTheme';

interface Props {
  data: DetailedAnalysisOutput;
}

function getConditionColor(score: number): string {
  if (score >= 4) return 'bg-emerald-400';
  if (score >= 3) return 'bg-white';
  if (score >= 2) return 'bg-orange-400';
  return 'bg-rose-400';
}

function getConditionLabel(score: number): string {
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Fair';
  if (score >= 2) return 'Poor';
  return 'Critical';
}

function ComponentCard({ component, index }: { component: ComponentEntry; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="p-3 rounded-xl border transition-colors"
      style={{
        backgroundColor: ANALYSIS_SOFT_SURFACE,
        borderColor: 'rgba(52, 211, 153, 0.18)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: ANALYSIS_BODY_WHITE }}>{component.name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            component.type === 'internal'
              ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {component.type}
          </span>
        </div>
        {component.requiresSupervision && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white border border-white/18">
            ⚠ Supervision
          </span>
        )}
      </div>

      <p className="text-xs mb-2" style={{ color: ANALYSIS_MUTED_WHITE }}>{component.function}</p>

      {/* Condition Score Bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide" style={{ color: ANALYSIS_MUTED_WHITE }}>Condition</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
          <div
            className={`h-full rounded-full ${getConditionColor(component.conditionScore)} transition-all`}
            style={{ width: `${(component.conditionScore / 5) * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${
          component.conditionScore >= 4 ? 'text-emerald-400' :
          component.conditionScore >= 3 ? 'text-white' :
          component.conditionScore >= 2 ? 'text-orange-400' : 'text-rose-400'
        }`}>
          {component.conditionScore}/5 {getConditionLabel(component.conditionScore)}
        </span>
      </div>
    </motion.div>
  );
}

export function DetailedAnalysisCard({ data }: Props) {
  return (
    <Card surface="neon" elevation="md" className="overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
          }}
        >
          <Activity className="w-5 h-5" style={{ color: ANALYSIS_WHITE }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: ANALYSIS_EMERALD }}>Detailed Resource Analysis</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Cpu className="w-3.5 h-3.5" style={{ color: ANALYSIS_WHITE }} />
            <span className="text-xs" style={{ color: ANALYSIS_BODY_WHITE }}>{data.probableDeviceIdentity}</span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Verdict Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-emerald-500/5 border border-primary-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-semibold text-primary-300 uppercase tracking-wide">Verdict Summary</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: ANALYSIS_BODY_WHITE }}>{data.verdictSummary}</p>
        </motion.div>

        {/* Component Profile */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: ANALYSIS_EMERALD }}>
              Component Profile
            </span>
            <span className="text-xs" style={{ color: ANALYSIS_MUTED_WHITE }}>
              ({data.componentProfile.length} components)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.componentProfile.map((component, i) => (
              <ComponentCard key={component.name} component={component} index={i} />
            ))}
          </div>
        </div>

        {/* Failure Pattern Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="w-4 h-4" style={{ color: ANALYSIS_WHITE }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: ANALYSIS_EMERALD }}>
              Failure Pattern Analysis
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: ANALYSIS_BODY_WHITE }}>{data.failurePatternAnalysis}</p>
        </motion.div>

        {/* Diagnostic Verdict */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgba(8, 18, 14, 0.78)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: ANALYSIS_EMERALD }}>
            Diagnostic Verdict
          </span>
          <p className="text-sm leading-relaxed" style={{ color: ANALYSIS_BODY_WHITE }}>{data.diagnosticVerdict}</p>
        </motion.div>
      </div>
    </Card>
  );
}
