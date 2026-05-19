import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle } from 'lucide-react';
import { AuthPanelBadge } from '../components/auth/AuthPanelBadge';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine where to redirect after login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  // If already authenticated, redirect immediately
  if (isAuthenticated) {
    navigate(from, { replace: true });
  }

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;
  const whiteFieldLabelStyle = {
    color: '#ffffff',
    textShadow: '0 0 8px rgba(255, 255, 255, 0.12)',
  } as const;
  const neonFieldInputStyle = {
    color: '#ffffff',
    backgroundColor: 'rgba(7, 23, 18, 0.96)',
    borderColor: 'rgba(45, 212, 191, 0.42)',
    boxShadow:
      '0 0 0 1px rgba(45, 212, 191, 0.18), inset 0 0 18px rgba(20, 184, 166, 0.08), 0 0 26px rgba(20, 184, 166, 0.08)',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center min-h-[70vh]"
    >
      <Card surface="neon" elevation="md" className="p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.28 }}
          >
            <AuthPanelBadge />
          </motion.div>
          <h1
            className="text-2xl font-bold"
            style={{
              color: '#ffffff',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.2), 0 0 26px rgba(255, 255, 255, 0.08)',
            }}
          >
            Welcome Back
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#ffffff' }}>
            Sign in to continue your recycling journey
          </p>
        </div>

        {/* Error message */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            labelStyle={whiteFieldLabelStyle}
            inputStyle={neonFieldInputStyle}
            className="placeholder:text-white/40"
          />

          {/* Password field */}
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            labelStyle={whiteFieldLabelStyle}
            inputStyle={neonFieldInputStyle}
            className="placeholder:text-white/40"
          />

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!isFormValid}
            className="w-full !bg-[#34d399] !text-black shadow-[0_0_18px_rgba(52,211,153,0.35),0_0_44px_rgba(52,211,153,0.24)] hover:!bg-[#6ee7b7]"
            leftIcon={!isSubmitting ? <LogIn className="w-4 h-4" /> : undefined}
          >
            Sign In
          </Button>
        </form>

        {/* Register link */}
        <p
          className="text-center text-sm mt-6"
          style={{
            color: '#ffffff',
          }}
        >
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
