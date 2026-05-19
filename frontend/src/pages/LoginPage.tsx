import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle } from 'lucide-react';
import { AuthPanelBadge } from '../components/auth/AuthPanelBadge';
import { GoogleLogo } from '../components/icons/GoogleLogo';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { login, isAuthenticated, authMode, loginWithProvider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  if (isAuthenticated) {
    navigate(from, { replace: true });
  }

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const fieldLabelStyle = { color: '#ffffff' } as const;
  const fieldInputStyle = {
    color: '#ffffff',
    backgroundColor: 'rgba(7, 23, 18, 0.96)',
    borderColor: 'rgba(52, 211, 153, 0.34)',
  } as const;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCognitoLogin = async (provider?: 'Google' | 'SignInWithApple') => {
    setError('');
    try {
      await loginWithProvider(provider, from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Cognito sign-in');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center min-h-[70vh]"
    >
      <Card surface="analysis" elevation="md" className="p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
            <AuthPanelBadge />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: '#ffffff' }}>
            {authMode === 'cognito' ? 'Sign In' : 'Welcome Back'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255, 255, 255, 0.84)' }}>
            {authMode === 'cognito'
              ? 'Sign in with your email password, or choose a provider below'
              : 'Sign in to continue your recycling journey'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-3 rounded-lg flex items-center gap-2"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
            }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-error)' }} />
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            labelStyle={fieldLabelStyle}
            inputStyle={fieldInputStyle}
            className="placeholder:text-white/40"
          />

          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            autoComplete="current-password"
            labelStyle={fieldLabelStyle}
            inputStyle={fieldInputStyle}
            className="placeholder:text-white/40"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!isFormValid}
            className="w-full !bg-[#34d399] !text-[#02130e] hover:!bg-[#6ee7b7]"
            leftIcon={!isSubmitting ? <LogIn className="w-4 h-4" /> : undefined}
          >
            {authMode === 'cognito' ? 'Continue with Email' : 'Sign In'}
          </Button>
        </form>

        {authMode === 'cognito' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-center text-xs mb-3" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              Or continue with
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 !min-h-[46px] !py-2 !text-sm"
                leftIcon={<GoogleLogo className="w-4 h-4" />}
                onClick={() => {
                  void handleCognitoLogin('Google');
                }}
              >
                Google
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-medium transition-colors"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          >
            Create one
          </Link>
        </p>
      </Card>
    </motion.div>
  );
}
