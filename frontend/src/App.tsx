import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TriageForm, TriageFormData } from './components/TriageForm';
import { FileUploader } from './components/FileUploader';
import { ResultsView } from './components/ResultsView';
import { useTriageSession } from './hooks/useTriageSession';
import { Header } from './components/Header';
import { ParticlesBackground } from './components/ParticlesBackground';
import { ErrorBoundary } from './components/ErrorBoundary';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

// Log config on startup (without exposing the full key)
console.log('[App] Config:', {
  apiUrl: API_URL || '(not set)',
  apiKeySet: API_KEY ? `${API_KEY.slice(0, 4)}...` : '(not set)',
});

function App() {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const { submitSession, session, isSubmitting, isPolling, error } =
    useTriageSession(API_URL, API_KEY);

  const handleFilesUploaded = useCallback((ids: string[]) => {
    console.log('[App] Files uploaded:', ids);
    setFileIds(ids);
  }, []);

  const handleSubmit = useCallback(
    (data: TriageFormData) => {
      console.log('[App] Form submitted:', data);
      submitSession(
        {
          deviceIdentity: data.deviceIdentity,
          failureSymptoms: data.failureSymptoms,
          userContext: data.userContext,
        },
        fileIds
      );
    },
    [submitSession, fileIds]
  );

  const showForm = !session && !isPolling;

  // Debug state
  console.log('[App] Render state:', { showForm, isPolling, isSubmitting, hasSession: !!session, error });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-animated relative overflow-hidden">
        <ParticlesBackground />

        <div className="relative z-10">
          <Header />

          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
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
                <ResultsView key="results" session={session} />
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
