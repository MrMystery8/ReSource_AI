import { useState, useRef, useCallback, useEffect } from 'react';
import type { CreateSessionRequest, PollSessionResponse } from '@resource-ai/shared';
import { ApiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const POLL_INTERVAL_MS = 3000;

export interface UseTriageSessionResult {
  submitSession: (data: CreateSessionRequest, fileIds: string[]) => void;
  session: PollSessionResponse | null;
  isSubmitting: boolean;
  isPolling: boolean;
  error: string | null;
}

/**
 * Custom hook that manages the triage session lifecycle:
 * - Submits a session via the ApiClient (with auth headers automatically included)
 * - Starts polling every 3 seconds after successful submission
 * - Stops polling when status is 'complete' or 'failed'
 * - Handles network errors gracefully
 * - Cleans up the polling interval on unmount
 */
export function useTriageSession(): UseTriageSessionResult {
  const { token } = useAuth();
  const [session, setSession] = useState<PollSessionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(token);

  // Always keep tokenRef in sync with the latest token value
  tokenRef.current = token;

  const apiClientRef = useRef<ApiClient>(
    new ApiClient(API_URL, API_KEY, () => tokenRef.current)
  );

  // tokenRef is updated on every render above, so apiClient always reads the latest token

  const stopPolling = useCallback(() => {
    console.log('[useTriageSession] Stopping polling');
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(
    (sessionId: string) => {
      console.log('[useTriageSession] Starting polling for session:', sessionId);
      sessionIdRef.current = sessionId;
      setIsPolling(true);

      const poll = async () => {
        try {
          console.log('[useTriageSession] Polling session:', sessionId);
          const result = await apiClientRef.current.pollSession(sessionId);
          console.log('[useTriageSession] Poll result:', {
            status: result.status,
            currentStage: result.currentStage,
            stagesCompleted: Object.keys(result.stages).filter(
              (k) => result.stages[k as keyof typeof result.stages] != null
            ),
            error: result.error,
          });
          setSession(result);

          if (result.status === 'complete' || result.status === 'failed') {
            console.log('[useTriageSession] Session finished with status:', result.status);
            stopPolling();
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'An error occurred while polling';
          console.error('[useTriageSession] Polling error:', err);
          setError(message);
          stopPolling();
        }
      };

      // Poll immediately, then set up interval
      poll();
      pollingIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  const handleSubmitSession = useCallback(
    async (data: CreateSessionRequest, fileIds: string[]) => {
      console.log('[useTriageSession] Submitting session:', { data, fileIds });
      setError(null);
      setSession(null);
      setIsSubmitting(true);
      stopPolling();

      try {
        const requestData: CreateSessionRequest = {
          ...data,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        };

        const sessionId = await apiClientRef.current.submitSession(requestData);
        console.log('[useTriageSession] Session created:', sessionId);
        startPolling(sessionId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An error occurred during submission';
        console.error('[useTriageSession] Submit error:', err);
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [startPolling, stopPolling]
  );

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    submitSession: handleSubmitSession,
    session,
    isSubmitting,
    isPolling,
    error,
  };
}
