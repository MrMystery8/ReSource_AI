import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type {
  PollSessionResponse,
  QuickVerdictOutput,
  SafetyGateOutput,
  DetailedAnalysisOutput,
  SecondLifeIdeasOutput,
  NextStepsOutput,
  ExpertiseLevel,
  ProjectIdea,
  StructuredUserContext,
} from '@resource-ai/shared';
import { ProgressIndicator } from './ProgressIndicator';
import { ConceptImage } from './ConceptImage';
import { SkeletonStage } from './SkeletonStage';
import { QuickVerdictCard } from './stages/QuickVerdictCard';
import { SafetyGateCard } from './stages/SafetyGateCard';
import { DetailedAnalysisCard } from './stages/DetailedAnalysisCard';
import { NextStepsCard } from './stages/NextStepsCard';
import { SecondLifeIdeasSection } from './SecondLifeIdeasSection';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const RELOAD_POLL_INTERVAL_MS = 2000;
const RELOAD_POLL_MAX_ATTEMPTS = 30;

export interface ResultsViewProps {
  session: PollSessionResponse | null;
  userExpertise?: ExpertiseLevel;
  onIdeaClick?: (idea: ProjectIdea) => void;
  sessionInputs?: {
    deviceIdentity: string;
    failureSymptoms: string;
    userContext: StructuredUserContext;
    fileIds?: string[];
  };
}

const STAGE_NAMES: Record<string, string> = {
  quickVerdict: 'Quick ReSource Verdict',
  safetyGate: 'Safety Gate',
  detailedAnalysis: 'Detailed Resource Analysis',
  secondLifeIdeas: 'Safe Second Life Ideas',
  nextSteps: 'Safe Next Steps & Recovery Route',
  conceptVisual: 'Concept Visual',
};

const STAGE_ORDER = [
  'quickVerdict',
  'safetyGate',
  'detailedAnalysis',
  'secondLifeIdeas',
  'nextSteps',
  'conceptVisual',
] as const;

// Individual item animation — each item animates itself on mount
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
};

export function ResultsView({ session, userExpertise = 'Beginner', onIdeaClick, sessionInputs }: ResultsViewProps) {
  const { token } = useAuth();
  const [isReloading, setIsReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [reloadedIdeas, setReloadedIdeas] = useState<ProjectIdea[] | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleReload = useCallback(async () => {
    if (!sessionInputs) {
      setReloadError('Session data not available for reload. Please submit a new analysis.');
      return;
    }

    setIsReloading(true);
    setReloadError(null);

    try {
      const apiClient = new ApiClient(API_URL, API_KEY, () => token);
      const newSessionId = await apiClient.reloadIdeas({
        deviceIdentity: sessionInputs.deviceIdentity,
        failureSymptoms: sessionInputs.failureSymptoms,
        userContext: sessionInputs.userContext,
        fileIds: sessionInputs.fileIds,
      });

      // Poll the new session until secondLifeIdeas stage is complete
      let attempts = 0;
      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const result = await apiClient.pollSession(newSessionId);

          if (result.stages.secondLifeIdeas) {
            // Got new ideas — update state and stop polling
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setReloadedIdeas((result.stages.secondLifeIdeas as SecondLifeIdeasOutput).ideas);
            setIsReloading(false);
          } else if (result.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setReloadError('Failed to generate new ideas. Please try again.');
            setIsReloading(false);
          } else if (attempts >= RELOAD_POLL_MAX_ATTEMPTS) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setReloadError('Reload timed out. Please try again.');
            setIsReloading(false);
          }
        } catch {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setReloadError('Could not reload ideas. Please try again.');
          setIsReloading(false);
        }
      }, RELOAD_POLL_INTERVAL_MS);
    } catch (err) {
      setReloadError(
        err instanceof Error ? err.message : 'Could not reload ideas. Please try again.'
      );
      setIsReloading(false);
    }
  }, [sessionInputs, token]);

  const handleIdeaClick = (idea: ProjectIdea) => {
    onIdeaClick?.(idea);
  };

  // No session yet — show full skeleton loading state
  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full min-w-0 max-w-4xl mx-auto space-y-6"
      >
        {/* Status Header Skeleton */}
        <Card elevation="sm" className="p-5">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Connecting to analysis pipeline...
            </span>
          </div>
        </Card>

        {/* Progress */}
        <ProgressIndicator stageName="Initializing" />

        {/* Skeleton placeholders */}
        <SkeletonStage label="Quick ReSource Verdict" />
        <SkeletonStage label="Safety Gate" />
        <SkeletonStage label="Detailed Analysis" />
      </motion.div>
    );
  }

  const { status, currentStage, error, stages } = session;

  // Count completed stages
  const completedStages = STAGE_ORDER.filter((key) => stages[key] != null);
  const totalExpectedStages = STAGE_ORDER.length;

  // Determine which stages are still pending (for skeleton display)
  const pendingStages = status === 'processing'
    ? STAGE_ORDER.filter((key) => stages[key] == null)
    : [];

  return (
    /*
     * w-full + min-w-0 prevent the container from stretching beyond the
     * viewport on narrow screens (Requirement 6.4, 9.2).
     */
    <motion.div
      className="w-full min-w-0 max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Status Header */}
      <motion.div {...fadeInUp}>
        <Card elevation="sm" className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status === 'processing' && (
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {status === 'complete' && (
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
              )}
              {status === 'failed' && (
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              )}
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {status === 'processing'
                  ? 'Analyzing your device...'
                  : status === 'complete'
                    ? 'Analysis Complete'
                    : 'Analysis Failed'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {status === 'processing' && currentStage && (
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border-default)',
                  }}
                >
                  {STAGE_NAMES[currentStage] ?? currentStage}
                </span>
              )}
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {completedStages.length}/{totalExpectedStages} stages
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {status === 'processing' && (
            <div
              className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface-elevated)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
                animate={{ width: `${(completedStages.length / totalExpectedStages) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Processing Indicator */}
      {status === 'processing' && currentStage && (
        <motion.div {...fadeInUp}>
          <ProgressIndicator stageName={STAGE_NAMES[currentStage] ?? currentStage} />
        </motion.div>
      )}

      {/* Error Display */}
      {status === 'failed' && error && (
        <motion.div {...fadeInUp} role="alert">
          <Card elevation="sm" className="p-5">
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                    Error in stage: {error.stage}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {error.message}
                  </p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border-default)',
                    }}
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Completed Stages */}
      {STAGE_ORDER.map((key, index) => {
        const stageData = stages[key];
        if (!stageData) return null;

        return (
          <motion.section
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            aria-label={STAGE_NAMES[key]}
          >
            {key === 'secondLifeIdeas'
              ? (
                <SecondLifeIdeasSection
                  ideas={reloadedIdeas ?? (stageData as SecondLifeIdeasOutput).ideas}
                  userExpertise={userExpertise}
                  onIdeaClick={handleIdeaClick}
                  onReload={handleReload}
                  isReloading={isReloading}
                  reloadError={reloadError}
                />
              )
              : renderStage(key, stageData)}
          </motion.section>
        );
      })}

      {/* Pending Stage Skeletons (wireframe placeholders) */}
      {pendingStages.length > 0 && (
        <>
          {pendingStages.slice(0, 2).map((key) => (
            <motion.div key={`skeleton-${key}`} {...fadeInUp}>
              <SkeletonStage label={STAGE_NAMES[key] ?? key} />
            </motion.div>
          ))}
          {pendingStages.length > 2 && (
            <motion.div {...fadeInUp} className="text-center py-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                +{pendingStages.length - 2} more stages pending...
              </span>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

function renderStage(key: string, data: unknown): React.ReactNode {
  try {
    switch (key) {
      case 'quickVerdict':
        return <QuickVerdictCard data={data as QuickVerdictOutput} />;
      case 'safetyGate':
        return <SafetyGateCard data={data as SafetyGateOutput} />;
      case 'detailedAnalysis':
        return <DetailedAnalysisCard data={data as DetailedAnalysisOutput} />;
      case 'secondLifeIdeas':
        // Handled inline in the render loop above (uses SecondLifeIdeasSection)
        return null;
      case 'nextSteps':
        return <NextStepsCard data={data as NextStepsOutput} />;
      case 'conceptVisual':
        return <ConceptImage data={data as { imageUrl: string }} />;
      default:
        return (
          <Card elevation="md" className="p-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              {STAGE_NAMES[key] ?? key}
            </h3>
            <pre className="text-xs whitespace-pre-wrap overflow-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </Card>
        );
    }
  } catch (err) {
    console.error(`[ResultsView] Error rendering stage "${key}":`, err, 'Data:', data);
    return (
      <Card elevation="sm" className="p-6">
        <div
          className="rounded-lg p-4"
          style={{
            border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-error)' }} />
            <div>
              <h3 className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                Failed to render: {STAGE_NAMES[key] ?? key}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                An error occurred while displaying this stage. Check the console for details.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }
}

export default ResultsView;
