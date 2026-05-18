import { motion } from 'framer-motion';
import type { DetailedAnalysisOutput, ComponentEntry } from '@resource-ai/shared';
import { Cpu, Activity, Stethoscope, FileText } from 'lucide-react';

interface Props {
  data: DetailedAnalysisOutput;
}

function getConditionColor(score: number): string {
  if (score >= 4) return 'bg-emerald-400';
  if (score >= 3) return 'bg-amber-400';
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
      className="p-3 rounded-xl bg-surface-elevated/40 border border-border-subtle hover:border-primary-500/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{component.name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            component.type === 'internal'
              ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {component.type}
          </span>
        </div>
        {component.requiresSupervision && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ⚠ Supervision
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted mb-2">{component.function}</p>

      {/* Condition Score Bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted uppercase tracking-wide">Condition</span>
        <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className={`h-full rounded-full ${getConditionColor(component.conditionScore)} transition-all`}
            style={{ width: `${(component.conditionScore / 5) * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${
          component.conditionScore >= 4 ? 'text-emerald-400' :
          component.conditionScore >= 3 ? 'text-amber-400' :
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
    <div className="overflow-hidden rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-colors">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Detailed Resource Analysis</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Cpu className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-secondary">{data.probableDeviceIdentity}</span>
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
          <p className="text-sm text-text-primary leading-relaxed">{data.verdictSummary}</p>
        </motion.div>

        {/* Component Profile */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Component Profile</span>
            <span className="text-xs text-text-muted">({data.componentProfile.length} components)</span>
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
            <Stethoscope className="w-4 h-4 text-text-muted" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Failure Pattern Analysis</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{data.failurePatternAnalysis}</p>
        </motion.div>

        {/* Diagnostic Verdict */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-4 rounded-xl bg-surface-elevated/50 border border-border-subtle"
        >
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-2">Diagnostic Verdict</span>
          <p className="text-sm text-text-primary leading-relaxed">{data.diagnosticVerdict}</p>
        </motion.div>
      </div>
    </div>
  );
}
