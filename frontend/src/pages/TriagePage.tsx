import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TriageForm, TriageFormData } from '../components/TriageForm';
import { FileUploader } from '../components/FileUploader';
import { ResultsView } from '../components/ResultsView';
import { PointsAnimation } from '../components/gamification/PointsAnimation';
import { BadgeUnlockToast } from '../components/gamification/BadgeUnlockToast';
import { useTriageSession } from '../hooks/useTriageSession';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type {
  UserStatsResponse,
  BadgeInfo,
  ProjectIdea,
  ExpertiseLevel,
  StructuredUserContext,
  PollSessionResponse,
} from '@resource-ai/shared';

// ---------------------------------------------------------------------------
// ARIA live region announcer
// ---------------------------------------------------------------------------
interface LiveAnnouncerProps {
  message: string;
  politeness: 'polite' | 'assertive';
}

function LiveAnnouncer({ message, politeness }: LiveAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const DEV_DEMO_SESSION: PollSessionResponse = {
  sessionId: 'demo-analysis-session',
  status: 'complete',
  currentStage: null,
  error: null,
  inputs: {
    deviceIdentity: 'Samsung Galaxy S10 with cracked display and battery swelling',
    failureSymptoms: 'Does not power on consistently, rear glass is loose, and the battery appears expanded.',
    userContext: {
      expertiseLevel: 'Intermediate',
      motivation: 'Environmental Impact',
      materialAvailability: 'Some Electronics Tools',
      timeCommitment: '1-3 Hours',
    },
    fileIds: [],
  },
  stages: {
    quickVerdict: {
      deviceIdentification: 'Samsung Galaxy S10 smartphone',
      confidence: 'high',
      riskLevel: 'Orange',
      salvageScore: 4,
      bestNextStep: 'Remove the swollen battery safely, then salvage the display assembly, cameras, and daughterboard if no heat damage is visible.',
      safetyWarning: 'Do not charge or puncture the swollen battery. Treat the device as a lithium fire risk until the cell is isolated.',
      topReusableResources: ['OLED display', 'Rear camera module', 'USB-C daughterboard', 'Speaker assembly'],
      missingInfoNotes: 'Liquid ingress and motherboard damage are still unconfirmed.',
    },
    safetyGate: {
      riskLevel: 'Orange',
      identifiedHazards: ['Swollen lithium-ion battery', 'Loose glass along the rear housing'],
      doNotPerform: ['Do not connect the phone to power', 'Do not lever tools directly under the battery pouch'],
      safeActions: ['Work on a non-flammable surface', 'Use plastic opening tools', 'Wear eye protection before opening the rear cover'],
      stopConditions: ['If the battery gets hot, emits odor, or begins venting', 'If the pouch starts creasing during removal'],
      recommendedSafeNextStep: 'Open the rear housing carefully, disconnect the battery first, and move the cell to a fire-safe container before evaluating salvageable parts.',
    },
    detailedAnalysis: {
      probableDeviceIdentity: 'Samsung Galaxy S10 (SM-G973 family)',
      componentProfile: [
        { name: 'OLED display', function: 'Primary touch display assembly', type: 'external', conditionScore: 4 },
        { name: 'Rear camera module', function: 'Multi-lens imaging system', type: 'internal', conditionScore: 4 },
        { name: 'USB-C daughterboard', function: 'Charging and wired data I/O', type: 'internal', conditionScore: 3 },
        { name: 'Battery pack', function: 'Primary power storage', type: 'internal', conditionScore: 1, requiresSupervision: true },
      ],
      failurePatternAnalysis: 'The battery swelling likely caused the rear cover lift and may be contributing to unstable boot behavior. Visible damage suggests a localized power failure rather than total board loss.',
      diagnosticVerdict: 'This unit is better suited for controlled parts recovery than for a repair-first attempt.',
      verdictSummary: 'Salvage value remains strong in the display and modular peripherals, but the battery condition makes safe isolation the top priority.',
    },
    secondLifeIdeas: {
      ideas: [
        {
          category: 'beginner',
          title: 'Phone Parts Display Frame',
          description: 'Turn the salvaged internals into a labeled teardown display that explains what each smartphone module does.',
          skillLevel: 'Beginner',
          requiredComponents: ['OLED display', 'Rear camera module', 'Speaker assembly'],
          additionalMaterials: ['Shadow box frame', 'Labels', 'Adhesive strips'],
        },
        {
          category: 'practical-creative',
          title: 'USB-C Repair Practice Board',
          description: 'Use the charging daughterboard as a safe practice target for continuity tests and connector rework drills.',
          skillLevel: 'Intermediate',
          requiredComponents: ['USB-C daughterboard'],
          additionalMaterials: ['Bench power supply', 'Multimeter', 'Soldering iron'],
        },
        {
          category: 'stem-learning',
          title: 'Camera Module Vision Demo',
          description: 'Prototype a simple imaging experiment by pairing the salvaged camera module with an adapter board and SBC.',
          skillLevel: 'Advanced',
          requiredComponents: ['Rear camera module'],
          additionalMaterials: ['Adapter board', 'Single-board computer', 'Ribbon cable breakout'],
        },
      ],
    },
    nextSteps: {
      safeFirstActions: ['Power the device fully down and keep it unplugged.', 'Move it to a non-flammable work surface.', 'Remove the swollen battery before further teardown.'],
      partsToKeep: ['Display assembly', 'Rear camera module', 'Speaker unit', 'Vibration motor'],
      partsToAvoid: ['Swollen battery', 'Heat-stressed adhesive strips'],
      overallRecommendation: 'Proceed as a controlled salvage task focused on battery isolation first and parts harvesting second.',
      trashWarnings: ['Dispose of the battery through a certified battery recycler.', 'Wrap broken glass before discarding any housing fragments.'],
      localRecoveryNote: 'If the battery swelling escalates or removal feels unstable, hand the entire device to a local e-waste facility instead of continuing.',
      hazardWarnings: [
        { component: 'Battery pack', risk: 'Thermal runaway if bent or punctured.' },
        { component: 'Rear glass', risk: 'Shard cuts during opening.' },
      ],
    },
    conceptVisual: null,
  },
};

export function TriagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fileIds, setFileIds] = useState<string[]>([]);
  const { submitSession, session, isSubmitting, isPolling, error } =
    useTriageSession();
  const { token } = useAuth();
  const showDemoAnalysis =
    import.meta.env.DEV && new URLSearchParams(location.search).get('demo') === 'analysis';

  // Track the user's expertise level from the most recent form submission
  const [userExpertise, setUserExpertise] = useState<ExpertiseLevel>('Beginner');
  // Track the full user context for passing to the guide page
  const [lastUserContext, setLastUserContext] = useState<StructuredUserContext | null>(null);
  // Track the full session inputs for reload functionality
  const [lastSessionInputs, setLastSessionInputs] = useState<{
    deviceIdentity: string;
    failureSymptoms: string;
    userContext: StructuredUserContext;
    fileIds?: string[];
  } | null>(null);

  // ARIA live region state
  const [announcement, setAnnouncement] = useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  } | null>(null);

  // Gamification state
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [showPoints, setShowPoints] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeInfo[]>([]);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

  // Store stats before session submission to compare after completion
  const preSessionStatsRef = useRef<UserStatsResponse | null>(null);
  const hasProcessedCompletionRef = useRef(false);
  const activeSession = showDemoAnalysis ? DEV_DEMO_SESSION : session;
  const activeSessionInputs = lastSessionInputs ?? (showDemoAnalysis ? {
    deviceIdentity: DEV_DEMO_SESSION.inputs!.deviceIdentity,
    failureSymptoms: DEV_DEMO_SESSION.inputs!.failureSymptoms,
    userContext: DEV_DEMO_SESSION.inputs!.userContext,
    fileIds: DEV_DEMO_SESSION.inputs!.fileIds,
  } : null);
  const activeUserContext = lastUserContext ?? activeSessionInputs?.userContext ?? null;
  const activeUserExpertise = activeUserContext?.expertiseLevel ?? userExpertise;

  const handleFilesUploaded = useCallback((ids: string[]) => {
    console.log('[TriagePage] Files uploaded:', ids);
    setFileIds(ids);
  }, []);

  const handleSubmit = useCallback(
    async (data: TriageFormData) => {
      console.log('[TriagePage] Form submitted:', data);

      // Capture expertise level for use in SecondLifeIdeasSection
      setUserExpertise(data.userContext.expertiseLevel ?? 'Beginner');
      setLastUserContext(data.userContext);
      setLastSessionInputs({
        deviceIdentity: data.deviceIdentity,
        failureSymptoms: data.failureSymptoms,
        userContext: data.userContext,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
      });

      // Capture current stats before submission for comparison later
      try {
        const apiClient = new ApiClient(API_URL, API_KEY, () => token);
        const stats = await apiClient.getStats();
        preSessionStatsRef.current = stats;
      } catch {
        // If we can't fetch stats, we'll still show points based on the new stats alone
        preSessionStatsRef.current = null;
      }

      // Reset gamification state for new session
      hasProcessedCompletionRef.current = false;
      setShowPoints(false);
      setPointsEarned(0);
      setNewBadges([]);
      setCurrentBadgeIndex(0);

      submitSession(
        {
          deviceIdentity: data.deviceIdentity,
          failureSymptoms: data.failureSymptoms,
          userContext: data.userContext,
        },
        fileIds
      );
    },
    [submitSession, fileIds, token]
  );

  // Detect session completion and trigger gamification display
  useEffect(() => {
    if (session?.status !== 'complete' || hasProcessedCompletionRef.current) {
      return;
    }

    hasProcessedCompletionRef.current = true;

    const fetchAndShowGamification = async () => {
      try {
        const apiClient = new ApiClient(API_URL, API_KEY, () => token);
        const newStats = await apiClient.getStats();

        // Calculate points earned
        const previousPoints = preSessionStatsRef.current?.points ?? 0;
        const earned = newStats.points - previousPoints;

        if (earned > 0) {
          setPointsEarned(earned);
          setShowPoints(true);
        }

        // Detect newly earned badges by comparing with previous stats
        const previousBadgeIds = new Set(
          (preSessionStatsRef.current?.badges ?? [])
            .filter((b) => b.earnedAt !== null)
            .map((b) => b.id)
        );

        const newlyEarned = newStats.badges.filter(
          (b) => b.earnedAt !== null && !previousBadgeIds.has(b.id)
        );

        if (newlyEarned.length > 0) {
          setNewBadges(newlyEarned);
          setCurrentBadgeIndex(0);
        }

        // Dispatch event so NavBar can refresh user data (points/level)
        window.dispatchEvent(new Event('gamification:updated'));

        // Announce success to screen readers
        setAnnouncement({ message: 'Triage session submitted successfully.', politeness: 'polite' });
      } catch (err) {
        console.error('[TriagePage] Failed to fetch gamification stats:', err);
      }
    };

    fetchAndShowGamification();
  }, [session?.status, token]);

  // Auto-dismiss badge toasts sequentially
  useEffect(() => {
    if (newBadges.length === 0 || currentBadgeIndex >= newBadges.length) {
      return;
    }

    const timer = setTimeout(() => {
      setCurrentBadgeIndex((prev) => prev + 1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [newBadges, currentBadgeIndex]);

  const handlePointsAnimationComplete = useCallback(() => {
    setShowPoints(false);
  }, []);

  const handleBadgeDismiss = useCallback(() => {
    setCurrentBadgeIndex((prev) => prev + 1);
  }, []);

  // Announce submission errors to screen readers
  useEffect(() => {
    if (error) {
      setAnnouncement({ message: `Submission failed: ${error}`, politeness: 'assertive' });
    }
  }, [error]);

  const handleIdeaClick = useCallback(
    (idea: ProjectIdea) => {
      navigate('/guide/new', {
        state: {
          ideaTitle: idea.title,
          ideaDescription: idea.description,
          requiredComponents: idea.requiredComponents,
          additionalMaterials: idea.additionalMaterials,
          userContext: activeUserContext,
          sessionId: activeSession?.sessionId,
        },
      });
    },
    [navigate, activeSession, activeUserContext]
  );

  const showForm = !activeSession && !isPolling;

  return (
    <>
      {/* ARIA live region for async operation announcements */}
      {announcement && (
        <LiveAnnouncer
          message={announcement.message}
          politeness={announcement.politeness}
        />
      )}

      {error && (
        <div
          className="max-w-3xl mx-auto mt-6 p-4 rounded-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
          }}
          role="alert"
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showForm && (
          <TriageForm
            key="form"
            onSubmit={handleSubmit}
            disabled={isSubmitting}
            fileUploader={
              <FileUploader
                apiUrl={API_URL}
                apiKey={API_KEY}
                authToken={token}
                onFilesUploaded={handleFilesUploaded}
              />
            }
          />
        )}

        {(activeSession || isPolling) && (
          <div className="relative" key="results">
            <ResultsView
              session={activeSession}
              userExpertise={activeUserExpertise}
              onIdeaClick={handleIdeaClick}
              sessionInputs={showDemoAnalysis ? undefined : activeSessionInputs ?? undefined}
            />

            {/* Points Animation Overlay */}
            <PointsAnimation
              points={pointsEarned}
              visible={showPoints}
              onComplete={handlePointsAnimationComplete}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Badge Unlock Toast — fixed position, shown outside the AnimatePresence */}
      {newBadges.length > 0 && currentBadgeIndex < newBadges.length && (
        <BadgeUnlockToast
          badge={newBadges[currentBadgeIndex]}
          visible={true}
          onDismiss={handleBadgeDismiss}
        />
      )}
    </>
  );
}
