import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { PollSessionResponse } from '@resource-ai/shared';
import { ResultsView } from '../components/ResultsView';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();
  const [session, setSession] = useState<PollSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const apiClientRef = useRef<ApiClient>(
    new ApiClient(API_URL, API_KEY, () => token)
  );

  // Keep the apiClient's getToken closure up to date with the latest token
  useEffect(() => {
    apiClientRef.current = new ApiClient(API_URL, API_KEY, () => token);
  }, [token]);

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSession() {
      try {
        const data = await apiClientRef.current.getSession(sessionId!);
        if (!cancelled) {
          setSession(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          // Check if it's a 404 error
          if (err instanceof Error && err.message.includes('404')) {
            setNotFound(true);
          } else {
            setNotFound(true);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-10 h-10 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading session...</p>
        </motion.div>
      </div>
    );
  }

  // 404 state
  if (notFound) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="card p-8 w-full max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Session Not Found</h1>
          <p className="text-text-secondary mb-6">
            The session you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/history"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-700/30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
        </div>
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
        className="inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-stone-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </Link>

      <ResultsView session={session} />
    </motion.div>
  );
}
