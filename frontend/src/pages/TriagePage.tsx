import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TriageForm, TriageFormData } from '../components/TriageForm';
import { FileUploader } from '../components/FileUploader';
import { ResultsView } from '../components/ResultsView';
import { PointsAnimation } from '../components/gamification/PointsAnimation';
import { BadgeUnlockToast } from '../components/gamification/BadgeUnlockToast';
import { useTriageSession } from '../hooks/useTriageSession';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import type { UserStatsResponse, BadgeInfo } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

export function TriagePage() {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const { submitSession, session, isSubmitting, isPolling, error } =
    useTriageSession();
  const { token } = useAuth();

  // Gamification state
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [showPoints, setShowPoints] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeInfo[]>([]);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

  // Store stats before session submission to compare after completion
  const preSessionStatsRef = useRef<UserStatsResponse | null>(null);
  const hasProcessedCompletionRef = useRef(false);

  const handleFilesUploaded = useCallback((ids: string[]) => {
    console.log('[TriagePage] Files uploaded:', ids);
    setFileIds(ids);
  }, []);

  const handleSubmit = useCallback(
    async (data: TriageFormData) => {
      console.log('[TriagePage] Form submitted:', data);

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

  const showForm = !session && !isPolling;

  return (
    <>
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-sm" role="alert">
          <p className="text-rose-300 text-sm font-medium">{error}</p>
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
                onFilesUploaded={handleFilesUploaded}
              />
            }
          />
        )}

        {(session || isPolling) && (
          <div className="relative" key="results">
            <ResultsView session={session} />

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
