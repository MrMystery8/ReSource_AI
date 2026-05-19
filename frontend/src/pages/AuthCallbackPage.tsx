import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { completeCognitoCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      setError('Missing Cognito authorization code.');
      return;
    }

    completeCognitoCallback(code, state)
      .then((returnTo) => {
        navigate(returnTo || '/triage', { replace: true });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to complete sign-in.';
        setError(message);
      });
  }, [completeCognitoCallback, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card surface="analysis" elevation="md" className="p-6 w-full max-w-lg">
          <h1 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>
            Authentication failed
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card surface="analysis" elevation="md" className="p-6 w-full max-w-lg">
        <h1 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>
          Finishing sign-in
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.82)' }}>
          Completing authentication with Cognito. This should only take a moment.
        </p>
      </Card>
    </div>
  );
}
