import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Package,
  ListOrdered,
} from 'lucide-react';
import type { ImplementationGuide, StructuredUserContext, SubmissionResult, Project } from '@resource-ai/shared';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { ProjectChatbot } from '../components/ProjectChatbot';
import { ProjectSubmission } from '../components/ProjectSubmission';
import { PointsAnimation } from '../components/gamification/PointsAnimation';
import { Card } from '../components/ui/Card';
import { TintedPanel } from '../components/ui/analysis-primitives';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const TIMEOUT_MS = 30_000;

const BACK_BUTTON_CLASS =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2';

const BACK_BUTTON_STYLE: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-card))',
  color: 'var(--color-text-primary)',
  borderColor: 'color-mix(in srgb, var(--color-primary) 20%, var(--color-border-default))',
  boxShadow: 'var(--shadow-sm)',
};

const GUIDE_PANEL_CLASS =
  'p-1 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]';

const GUIDE_PANEL_STYLE: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-primary) 14%, var(--color-border-default))',
  boxShadow: '0 12px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)',
};

// ─── State shape passed via React Router location.state ───

export interface GuidePageState {
  ideaTitle: string;
  ideaDescription: string;
  requiredComponents: string[];
  additionalMaterials: string[];
  userContext: StructuredUserContext;
  sessionId: string;
}

// ─── Skeleton loading component ───

function GuideSkeleton() {
  return (
    <div
      className="w-full max-w-3xl mx-auto animate-pulse space-y-6"
      aria-busy="true"
      aria-label="Loading implementation guide"
    >
      {/* Title skeleton */}
      <div className="h-8 rounded-lg w-2/3" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />
      <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />

      {/* Materials skeleton */}
      <Card elevation="sm" className="p-6 space-y-3">
        <div className="h-5 rounded w-1/4" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />
        ))}
      </Card>

      {/* Steps skeleton */}
      <Card elevation="sm" className="p-6 space-y-4">
        <div className="h-5 rounded w-1/4" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 rounded w-full" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />
            <div className="h-3 rounded w-5/6" style={{ backgroundColor: 'var(--color-surface-elevated)' }} />
          </div>
        ))}
      </Card>

      {/* Time + warnings skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card elevation="sm" className="p-4 h-20">
          <div />
        </Card>
        <Card elevation="sm" className="p-4 h-20">
          <div />
        </Card>
      </div>
    </div>
  );
}

// ─── Error state component ───

interface GuideErrorProps {
  message: string;
  isTimeout: boolean;
  onRetry: () => void;
}

function GuideError({ message, isTimeout, onRetry }: GuideErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center min-h-[50vh]"
    >
      <Card elevation="md" className="p-8 w-full max-w-md text-center">
        <AlertTriangle
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: 'var(--color-warning)' }}
        />
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {isTimeout ? 'Request Timed Out' : 'Failed to Generate Guide'}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
          style={{
            color: 'var(--color-surface)',
            backgroundColor: 'var(--color-primary)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-primary-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-primary)';
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </Card>
    </motion.div>
  );
}

// ─── Main page component ───

export function ImplementationGuidePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { token } = useAuth();

  const state = location.state as GuidePageState | null;

  // When navigating from history, routeProjectId is a real ID (not 'new').
  // When navigating from triage results, routeProjectId is 'new' and state has the data.
  const isViewingExisting = routeProjectId !== 'new' && !!routeProjectId && !state;

  const [guide, setGuide] = useState<ImplementationGuide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  // When loading an existing project, we populate these from the fetched project
  const [loadedProject, setLoadedProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);

  // Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Points animation state
  const [showPoints, setShowPoints] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Project ID returned by the guide generate API
  const [projectId, setProjectId] = useState<string | null>(
    isViewingExisting ? routeProjectId ?? null : null
  );

  // Keep a stable ref to the latest request body so retry re-sends the same request
  const requestBodyRef = useRef<GuidePageState | null>(state);

  // Keep the abort controller ref so we can cancel on unmount or retry
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchGuide = useCallback(async () => {
    const body = requestBodyRef.current;
    if (!body) return;

    // Cancel any in-flight request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set a 30-second timeout that aborts the request
    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsTimeout(true);
      setError(
        'The request took too long to complete (30 seconds). Please try again.'
      );
      setIsLoading(false);
    }, TIMEOUT_MS);

    setIsLoading(true);
    setError(null);
    setIsTimeout(false);

    try {
      const apiClient = new ApiClient(API_URL, API_KEY, () => token);

      const response = await apiClient.generateGuide(
        {
          ideaTitle: body.ideaTitle,
          ideaDescription: body.ideaDescription,
          requiredComponents: body.requiredComponents,
          additionalMaterials: body.additionalMaterials,
          userContext: body.userContext,
          sessionId: body.sessionId,
        },
        controller.signal
      );

      clearTimeout(timeoutId);
      setGuide(response.guide);
      setProjectId(response.projectId);
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Ignore abort errors triggered by the timeout handler (it already set state)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate the implementation guide. Please try again.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [token]);

  // ─── Load existing project from API (history navigation) ───
  useEffect(() => {
    if (!isViewingExisting || !routeProjectId) return;

    setIsLoadingProject(true);
    setProjectLoadError(null);

    const apiClient = new ApiClient(API_URL, API_KEY, () => token);
    apiClient
      .getProject(routeProjectId)
      .then((project) => {
        setLoadedProject(project);
        // If the project already has a guide, show it directly
        if (project.guide) {
          setGuide(project.guide);
        } else {
          // No guide yet — trigger generation using the project's stored data
          requestBodyRef.current = {
            ideaTitle: project.ideaTitle,
            ideaDescription: project.ideaDescription,
            requiredComponents: project.requiredComponents,
            additionalMaterials: project.additionalMaterials,
            userContext: project.userContext,
            sessionId: project.sessionId,
          };
        }
      })
      .catch((err) => {
        setProjectLoadError(
          err instanceof Error ? err.message : 'Failed to load project'
        );
      })
      .finally(() => {
        setIsLoadingProject(false);
      });
  }, [isViewingExisting, routeProjectId, token]);

  // Once a project is loaded without a guide, generate one
  useEffect(() => {
    if (!isViewingExisting || !loadedProject || loadedProject.guide) return;
    if (requestBodyRef.current) {
      fetchGuide();
    }
  }, [isViewingExisting, loadedProject, fetchGuide]);

  // Derive the effective state — either from router state (new) or loaded project (existing)
  const effectiveState: GuidePageState | null = state ?? (loadedProject
    ? {
        ideaTitle: loadedProject.ideaTitle,
        ideaDescription: loadedProject.ideaDescription,
        requiredComponents: loadedProject.requiredComponents,
        additionalMaterials: loadedProject.additionalMaterials,
        userContext: loadedProject.userContext,
        sessionId: loadedProject.sessionId,
      }
    : null);

  // Fetch on mount — only for new guides (not when viewing existing projects)
  useEffect(() => {
    if (!state || isViewingExisting) return;
    requestBodyRef.current = state;
    fetchGuide();

    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount

  // Handle grading result: award points and trigger animation
  const handleGraded = useCallback((result: SubmissionResult) => {
    setPointsEarned(result.points);
    setShowPoints(true);
  }, []);

  // ─── Loading state for existing project fetch ───
  if (isViewingExisting && isLoadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: 'var(--color-primary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Loading project...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error state for existing project fetch ───
  if (isViewingExisting && projectLoadError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <Card elevation="md" className="p-8 w-full max-w-md text-center">
          <AlertTriangle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: 'var(--color-warning)' }}
          />
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Project Not Found
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {projectLoadError}
          </p>
          <button
            onClick={() => navigate('/history')}
            className={BACK_BUTTON_CLASS}
            style={BACK_BUTTON_STYLE}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </button>
        </Card>
      </motion.div>
    );
  }

  // ─── Guard: no state and not viewing existing ───
  if (!effectiveState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <Card elevation="md" className="p-8 w-full max-w-md text-center">
          <AlertTriangle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: 'var(--color-warning)' }}
          />
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No Project Selected
          </h2>
          <p className="text-sm mb-6 prose-container mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            Navigate here by clicking an idea card from your triage results.
          </p>
          <button
            onClick={() => navigate('/')}
            className={BACK_BUTTON_CLASS}
            style={BACK_BUTTON_STYLE}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </button>
        </Card>
      </motion.div>
    );
  }

  const isBeginnerLevel = effectiveState.userContext.expertiseLevel === 'Beginner';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className={`${BACK_BUTTON_CLASS} mb-6`}
        style={BACK_BUTTON_STYLE}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Page title */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {effectiveState.ideaTitle}
        </h1>
        <p
          className="text-sm sm:text-base mt-1 prose-container"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {effectiveState.ideaDescription}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && <GuideSkeleton />}

      {/* Error state */}
      {!isLoading && error && (
        <GuideError message={error} isTimeout={isTimeout} onRetry={fetchGuide} />
      )}

      {/* Success state */}
      {!isLoading && !error && guide && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Estimated time + expertise badge */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-elevated))',
                color: 'var(--color-text-secondary)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-border-default))',
              }}
            >
              {effectiveState.userContext.expertiseLevel}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-elevated))',
                color: 'var(--color-text-secondary)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-border-default))',
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              {guide.estimatedTime}
            </span>
          </div>

          {/* Safety warnings */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card
              elevation="sm"
              className={GUIDE_PANEL_CLASS}
              style={GUIDE_PANEL_STYLE}
              aria-labelledby="safety-heading"
            >
              <TintedPanel tone="warning" className="p-5 sm:p-6">
                <h2
                  id="safety-heading"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                  style={{ color: '#ffffff' }}
                >
                  <ShieldAlert className="w-5 h-5" style={{ color: '#fbbf24' }} />
                  Safety Warnings
                </h2>
                {guide.safetyWarnings.length === 1 &&
                guide.safetyWarnings[0] === 'No specific safety concerns' ? (
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    No specific safety concerns for this project.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {guide.safetyWarnings.map((warning, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: '#fbbf24' }}
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span style={{ color: 'rgba(255,255,255,0.88)' }}>{warning}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TintedPanel>
            </Card>
          </motion.div>

          {/* Materials list */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card
              elevation="sm"
              className={GUIDE_PANEL_CLASS}
              style={GUIDE_PANEL_STYLE}
              aria-labelledby="materials-heading"
            >
              <TintedPanel tone="primary" className="p-5 sm:p-6">
                <h2
                  id="materials-heading"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                  style={{ color: '#ffffff' }}
                >
                  <Package className="w-5 h-5" style={{ color: '#34d399' }} />
                  Materials &amp; Tools
                  <span
                    className="ml-auto text-xs font-normal"
                    style={{ color: 'rgba(255,255,255,0.64)' }}
                  >
                    {guide.materials.length} item{guide.materials.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {guide.materials.map((material, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'rgba(255,255,255,0.86)' }}
                    >
                      <CheckCircle2
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: '#34d399' }}
                      />
                      {material}
                    </li>
                  ))}
                </ul>
              </TintedPanel>
            </Card>
          </motion.div>

          {/* Step-by-step instructions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card
              elevation="sm"
              className={GUIDE_PANEL_CLASS}
              style={GUIDE_PANEL_STYLE}
              aria-labelledby="steps-heading"
            >
              <TintedPanel tone="default" className="p-5 sm:p-6">
                <h2
                  id="steps-heading"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                  style={{ color: '#ffffff' }}
                >
                  <ListOrdered className="w-5 h-5" style={{ color: '#34d399' }} />
                  Step-by-Step Instructions
                  <span
                    className="ml-auto text-xs font-normal"
                    style={{ color: 'rgba(255,255,255,0.64)' }}
                  >
                    {guide.steps.length} step{guide.steps.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <ol className="space-y-5">
                  {guide.steps.map((step) => (
                    <li key={step.stepNumber} className="flex gap-4">
                      {/* Step number badge */}
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                        style={{
                          backgroundColor: 'rgba(52,211,153,0.18)',
                          color: '#34d399',
                          border: '1px solid rgba(52,211,153,0.45)',
                        }}
                        aria-hidden="true"
                      >
                        {step.stepNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm leading-relaxed prose-container"
                          style={{ color: 'rgba(255,255,255,0.92)' }}
                        >
                          {step.instruction}
                        </p>
                        {/* Show explanation for Beginner level (or whenever explanation is present) */}
                        {(isBeginnerLevel || step.explanation) && step.explanation && (
                          <p
                            className="mt-1.5 text-xs leading-relaxed italic pl-3 prose-container"
                            style={{
                              color: 'rgba(255,255,255,0.68)',
                              borderLeft: '2px solid rgba(52,211,153,0.32)',
                            }}
                          >
                            {step.explanation}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </TintedPanel>
            </Card>
          </motion.div>

          {/* Project Submission section */}
          {projectId && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card
                elevation="sm"
                className={GUIDE_PANEL_CLASS}
                style={GUIDE_PANEL_STYLE}
                aria-labelledby="submission-heading"
              >
                <TintedPanel tone="primary" className="p-5 sm:p-6">
                  <h2
                    id="submission-heading"
                    className="flex items-center gap-2 text-lg font-semibold mb-4"
                    style={{ color: '#ffffff' }}
                  >
                    Submit Your Project
                  </h2>
                  {/* Points animation overlay — positioned relative to this container */}
                  <div className="relative">
                    <PointsAnimation
                      points={pointsEarned}
                      visible={showPoints}
                      onComplete={() => setShowPoints(false)}
                    />
                    <ProjectSubmission
                      projectId={projectId}
                      guideContext={{
                        ideaTitle: effectiveState.ideaTitle,
                        expectedOutcome: effectiveState.ideaDescription,
                        steps: guide.steps.map((s) => s.instruction),
                      }}
                      onGraded={handleGraded}
                      apiUrl={API_URL}
                      apiKey={API_KEY}
                      authToken={token}
                    />
                  </div>
                </TintedPanel>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Inline loading indicator for retry */}
      {isLoading && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: 'var(--color-primary)' }}
          />
          Generating guide…
        </div>
      )}

      {/* Project Chatbot — rendered whenever the guide is loaded */}
      {guide && (
        <ProjectChatbot
          projectContext={{
            ideaTitle: effectiveState.ideaTitle,
            materials: guide.materials,
            steps: guide.steps.map((s) => s.instruction),
            deviceInfo: effectiveState.ideaDescription,
          }}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((prev) => !prev)}
        />
      )}
    </motion.div>
  );
}
