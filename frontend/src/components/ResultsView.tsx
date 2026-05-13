import type {
  PollSessionResponse,
  QuickVerdictOutput,
  SafetyGateOutput,
  ReusablePartsMapOutput,
  ImpactCardOutput,
  ConceptVisualOutput,
  RiskLevel,
} from '@resource-ai/shared';
import { ProgressIndicator } from './ProgressIndicator';
import { StageCard } from './StageCard';
import { PartsMapTable } from './PartsMapTable';
import { ImpactCard } from './ImpactCard';
import { ConceptImage } from './ConceptImage';
import { RiskBadge } from './RiskBadge';
import './ResultsView.css';

export interface ResultsViewProps {
  session: PollSessionResponse;
}

const STAGE_NAMES: Record<string, string> = {
  quickVerdict: 'Quick ReSource Verdict',
  safetyGate: 'Safety Gate',
  detailedAnalysis: 'Detailed Resource Analysis',
  reusablePartsMap: 'Reusable Parts Map',
  secondLifeIdeas: 'Safe Second Life Ideas',
  nextSteps: 'Safe Next Steps and Recovery Route',
  impactCard: 'ReSource Impact Card',
  conceptVisual: 'ReSource Concept Visual',
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

export function ResultsView({ session }: ResultsViewProps) {
  const { status, currentStage, error, stages } = session;

  return (
    <div className="results-view">
      <h2 className="results-view__title">Triage Results</h2>

      {status === 'processing' && currentStage && (
        <ProgressIndicator stageName={STAGE_NAMES[currentStage] ?? currentStage} />
      )}

      {status === 'failed' && error && (
        <div className="results-view__error" role="alert">
          <strong>Error in stage: {error.stage}</strong>
          <p>{error.message}</p>
        </div>
      )}

      <div className="results-view__stages">
        {STAGE_ORDER.map((key) => {
          const stageData = stages[key];
          if (!stageData) return null;

          return (
            <section
              className="results-view__stage"
              key={key}
              aria-label={STAGE_NAMES[key]}
            >
              {renderStage(key, stageData)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function renderStage(key: string, data: unknown): React.ReactNode {
  switch (key) {
    case 'quickVerdict': {
      const qv = data as QuickVerdictOutput;
      return (
        <div className="results-view__quick-verdict">
          <StageCard stageName={STAGE_NAMES[key]} data={qv as unknown as Record<string, unknown>} />
          {qv.riskLevel && (
            <div className="results-view__risk-level">
              <RiskBadge level={qv.riskLevel as RiskLevel} />
            </div>
          )}
        </div>
      );
    }
    case 'safetyGate': {
      const sg = data as SafetyGateOutput;
      return (
        <div className="results-view__safety-gate">
          <StageCard stageName={STAGE_NAMES[key]} data={sg as unknown as Record<string, unknown>} />
          {sg.riskLevel && (
            <div className="results-view__risk-level">
              <RiskBadge level={sg.riskLevel as RiskLevel} />
            </div>
          )}
        </div>
      );
    }
    case 'reusablePartsMap':
      return <PartsMapTable data={data as ReusablePartsMapOutput} />;
    case 'impactCard':
      return <ImpactCard data={data as ImpactCardOutput} />;
    case 'conceptVisual':
      return <ConceptImage data={data as ConceptVisualOutput} />;
    default:
      return (
        <StageCard
          stageName={STAGE_NAMES[key] ?? key}
          data={data as Record<string, unknown>}
        />
      );
  }
}

export default ResultsView;
