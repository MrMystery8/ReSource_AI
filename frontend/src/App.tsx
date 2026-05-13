import { useState, useCallback } from 'react';
import { TriageForm, TriageFormData } from './components/TriageForm';
import { FileUploader } from './components/FileUploader';
import { ResultsView } from './components/ResultsView';
import { useTriageSession } from './hooks/useTriageSession';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

function App() {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const { submitSession, session, isSubmitting, isPolling, error } =
    useTriageSession(API_URL, API_KEY);

  const handleFilesUploaded = useCallback((ids: string[]) => {
    setFileIds(ids);
  }, []);

  const handleSubmit = useCallback(
    (data: TriageFormData) => {
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

  return (
    <div className="app">
      <header className="app__header">
        <h1>ReSource AI - E-Waste Triage</h1>
      </header>

      <main className="app__main">
        {error && (
          <div className="app__error" role="alert">
            <p>{error}</p>
          </div>
        )}

        {showForm && (
          <TriageForm
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

        {session && <ResultsView session={session} />}
      </main>
    </div>
  );
}

export default App;
