import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import type { PollSessionResponse, ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { ResultsView } from '../components/ResultsView';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// ─── Skeleton for session detail ──────────────────────────────────────────

function SessionDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading session…">
      {/* Back link placeholder */}
      <Skeleton variant="text" width={120} height={36} className="mb-6" />

      {/* Main content card skeleton */}
      <Card elevation="md" className="p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" width="60%" height={28} />
            <Skeleton variant="text" width="35%" height={16} />
          </div>
          <Skeleton variant="text" width={80} height={28} />
        </div>

        {/* Divider */}
        <div
          className="h-px w-full"
          style={{ backgroundColor: 'var(--color-border-subtle)' }}
        />

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton variant="text" width="70%" height={12} />
              <Skeleton variant="text" width="50%" height={20} />
            </div>
          ))}
        </div>

        {/* Content blocks */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" width="30%" height={18} />
            <Skeleton variant="rectangular" height={80} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── SessionDetailPage ────────────────────────────────────────────────────

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<PollSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const apiClientRef = useRef<ApiClient>(
    new ApiClient(API_URL, API_KEY, () => token)
  );

  // Keep the apiClient's getToken closure up to date with the latest token
  useEffect(() => {
    apiClientRef.current = new ApiClient(API_URL, API_KEY, () => token);
  }, [token]);

  // Derive user expertise from the session's stored user context
  const userExpertise: ExpertiseLevel =
    session?.inputs?.userContext?.expertiseLevel ?? 'Beginner';

  // Navigate to the implementation guide when an idea card is clicked from history
  const handleIdeaClick = useCallback(
    (idea: ProjectIdea) => {
      if (!session) return;
      const userContext = session.inputs?.userContext ?? {
        expertiseLevel: 'Beginner' as ExpertiseLevel,
        motivation: 'Environmental Impact' as const,
        materialAvailability: 'Basic Household Tools' as const,
        timeCommitment: 'Under 1 Hour' as const,
      };

      navigate('/guide/new', {
        state: {
          ideaTitle: idea.title,
          ideaDescription: idea.description,
          requiredComponents: idea.requiredComponents,
          additionalMaterials: idea.additionalMaterials,
          userContext,
          sessionId: session.sessionId,
        },
      });
    },
    [navigate, session]
  );

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setNotFound(false);

    try {
      const data = await apiClientRef.current.getSession(sessionId);
      setSession(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('404')) {
        setNotFound(true);
      } else {
        setFetchError(
          err instanceof Error ? err.message : 'Failed to load session'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!sessionId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setFetchError(null);
      setNotFound(false);

      try {
        const data = await apiClientRef.current.getSession(sessionId);
        if (!cancelled) setSession(data);
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof Error && err.message.includes('404')) {
            setNotFound(true);
          } else {
            setFetchError(
              err instanceof Error ? err.message : 'Failed to load session'
            );
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Loading state — skeleton screen (>300ms per Requirement 8.1)
  if (isLoading) {
    return <SessionDetailSkeleton />;
  }

  // 404 state — session not found
  if (notFound) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="w-full max-w-md">
          <EmptyState
            icon={FileQuestion}
            title="Session not found"
            description="The session you're looking for doesn't exist or you don't have access to it."
            ctaElement={
              <Link
                to="/history"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to History
              </Link>
            }
          />
        </div>
      </motion.div>
    );
  }

  // Error state — network/server failure with retry
  if (fetchError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <ErrorState
          message={fetchError}
          onRetry={() => {
            setIsLoading(true);
            setFetchError(null);
            fetchSession();
          }}
        />
      </motion.div>
    );
  }

  // Session found — render results
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        to="/history"
        className="inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          color: 'var(--color-text-secondary)',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </Link>

      <ResultsView session={session} userExpertise={userExpertise} onIdeaClick={handleIdeaClick} />
    </motion.div>
  );
}
