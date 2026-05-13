import { motion } from 'framer-motion';
import type {
  PollSessionResponse,
  QuickVerdictOutput,
  SafetyGateOutput,
  ReusablePartsMapOutput,
  ImpactCardOutput,
  RiskLevel,
} from '@resource-ai/shared';
import { ProgressIndicator } from './ProgressIndicator';
import { StageCard } from './StageCard';
import { PartsMapTable } from './PartsMapTable';
import { ImpactCard } from './ImpactCard';
import { RiskBadge } from './RiskBadge';
import { ConceptImage } from './ConceptImage';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ResultsViewProps {
  session: PollSessionResponse | null;
}

const STAGE_NAMES: Record<string, string> = {
  quickVerdict: 'Quick ReSource Verdict',
  safetyGate: 'Safety Gate',
  detailedAnalysis: 'Detailed Resource Analysis',
  reusablePartsMap: 'Reusable Parts Map',
  secondLifeIdeas: 'Safe Second Life Ideas',
  nextSteps: 'Safe Next Steps & Recovery Route',
  impactCard: 'ReSource Impact Card',
  conceptVisual: 'Concept Visual',
};

const STAGE_ORDER = [
  'quickVerdict',
  'safetyGate',
  'detailedAnalysis',
  'reusablePartsMap',
  'secondLifeIdeas',
  'nextSteps',
  'impactCard',
  'conceptVisual',
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function ResultsView({ session }: ResultsViewProps) {
  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="glass-card p-8 max-w-2xl mx-auto text-center"
      >
        <ProgressIndicator stageName="Initializing" />
      </motion.div>
    );
  }

  const { status, currentStage, error, stages } = session;

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Status Header */}
      <motion.div variants={itemVariants} className="glass-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'processing' && (
            <motion.div
              className="w-3 h-3 rounded-full bg-primary-400"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {status === 'complete' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {status === 'failed' && <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium text-text-primary capitalize">
            {status === 'processing' ? 'Analyzing your device...' : status === 'complete' ? 'Analysis Complete' : 'Analysis Failed'}
          </span>
        </div>
        {status === 'processing' && currentStage && (
          <span className="text-xs text-text-muted bg-surface-elevated px-3 py-1 rounded-full">
            {STAGE_NAMES[currentStage] ?? currentStage}
          </span>
        )}
      </motion.div>

      {/* Processing Indicator */}
      {status === 'processing' && currentStage && (
        <motion.div variants={itemVariants}>
          <ProgressIndicator stageName={STAGE_NAMES[currentStage] ?? currentStage} />
        </motion.div>
      )}

      {/* Error */}
      {status === 'failed' && error && (
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Error in stage: {error.stage}</p>
              <p className="text-sm text-rose-300/80 mt-1">{error.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stages */}
      {STAGE_ORDER.map((key) => {
        const stageData = stages[key];
        if (!stageData) return null;

        return (
          <motion.section
            key={key}
            variants={itemVariants}
            aria-label={STAGE_NAMES[key]}
          >
            {renderStage(key, stageData)}
          </motion.section>
        );
      })}
    </motion.div>
  );
}

function renderStage(key: string, data: unknown): React.ReactNode {
  switch (key) {
    case 'quickVerdict': {
      const qv = data as QuickVerdictOutput;
      return (
        <div className="glass-card glass-card-hover p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">{STAGE_NAMES[key]}</h3>
            {qv.riskLevel && <RiskBadge level={qv.riskLevel as RiskLevel} />}
          </div>
          <StageCard data={qv as unknown as Record<string, unknown>} />
        </div>
      );
    }
    case 'safetyGate': {
      const sg = data as SafetyGateOutput;
      return (
        <div className="glass-card glass-card-hover p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">{STAGE_NAMES[key]}</h3>
            {sg.riskLevel && <RiskBadge level={sg.riskLevel as RiskLevel} />}
          </div>
          <StageCard data={sg as unknown as Record<string, unknown>} />
        </div>
      );
    }
    case 'reusablePartsMap':
      return <PartsMapTable data={data as ReusablePartsMapOutput} />;
    case 'impactCard':
      return <ImpactCard data={data as ImpactCardOutput} />;
    case 'conceptVisual':
      return <ConceptImage data={data as { imageUrl: string }} />;
    default:
      return (
        <div className="glass-card glass-card-hover p-6 space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">{STAGE_NAMES[key] ?? key}</h3>
          <StageCard data={data as Record<string, unknown>} />
        </div>
      );
  }
}

export default ResultsView;
