import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { AuthPanelBadge } from '../components/auth/AuthPanelBadge';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEBOUNCE_MS = 300;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
} as const;

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fieldLabelStyle = { color: '#ffffff' } as const;
  const fieldInputStyle = {
    color: '#ffffff',
    backgroundColor: 'rgba(7, 23, 18, 0.96)',
    borderColor: 'rgba(52, 211, 153, 0.34)',
  } as const;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateField = useCallback(
    (name: keyof FormData, value: string, allData?: FormData): string | undefined => {
      const data = allData ?? formData;
      switch (name) {
        case 'email':
          if (!value.trim()) return 'Email is required';
          if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address';
          return undefined;
        case 'password':
          if (!value) return 'Password is required';
          if (value.length < 8) return 'Password must be at least 8 characters';
          return undefined;
        case 'confirmPassword':
          if (!value) return 'Please confirm your password';
          if (value !== data.password) return 'Passwords do not match';
          return undefined;
        case 'displayName':
          if (!value.trim()) return 'Display name is required';
          if (value.trim().length > 100) return 'Display name must be 100 characters or less';
          return undefined;
        default:
          return undefined;
      }
    },
    [formData]
  );

  const handleChange = useCallback(
    (name: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear existing debounce timer for this field
      if (debounceTimers.current[name]) {
        clearTimeout(debounceTimers.current[name]);
      }

      // Debounced validation
      debounceTimers.current[name] = setTimeout(() => {
        if (touched[name]) {
          const newData = { ...formData, [name]: value };
          const error = validateField(name, value, newData);
          setErrors((prev) => ({ ...prev, [name]: error }));

          // Also re-validate confirmPassword if password changes
          if (name === 'password' && touched.confirmPassword) {
            const confirmError = validateField('confirmPassword', newData.confirmPassword, newData);
            setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
          }
        }
      }, DEBOUNCE_MS);
    },
    [formData, touched, validateField]
  );

  const handleBlur = useCallback(
    (name: keyof FormData) => () => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, formData[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [formData, validateField]
  );

  const isFormValid = useCallback((): boolean => {
    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);
    const confirmError = validateField('confirmPassword', formData.confirmPassword);
    const nameError = validateField('displayName', formData.displayName);
    return !emailError && !passwordError && !confirmError && !nameError;
  }, [formData, validateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all fields and validate
    const allTouched = { email: true, password: true, confirmPassword: true, displayName: true };
    setTouched(allTouched);

    const newErrors: FormErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword),
      displayName: validateField('displayName', formData.displayName),
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some((err) => !!err)) {
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      await register(formData.email, formData.password, formData.displayName.trim());
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      // Check for 409 conflict (email already registered)
      if (message.toLowerCase().includes('already') || message.includes('409')) {
        setToast('Email already registered');
      } else {
        setToast(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card surface="analysis" elevation="md" className="p-8 sm:p-10">
          <motion.form
            onSubmit={handleSubmit}
            noValidate
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center mb-8">
              <AuthPanelBadge />
              <h1
                className="text-2xl font-bold"
                style={{ color: '#ffffff' }}
              >
                Create Account
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
                Join ReSource AI and start your recycling journey
              </p>
            </motion.div>

            {/* Toast for server errors */}
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                  color: 'var(--color-error)',
                }}
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{toast}</span>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-error)' }}
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Display Name Field */}
            <motion.div variants={itemVariants} className="mb-4">
              <Input
                label="Display Name"
                id="register-displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange('displayName')}
                onBlur={handleBlur('displayName')}
                placeholder="Your display name"
                maxLength={100}
                error={touched.displayName ? errors.displayName : undefined}
                labelStyle={fieldLabelStyle}
                inputStyle={fieldInputStyle}
                className="placeholder:text-white/40"
              />
            </motion.div>

            {/* Email Field */}
            <motion.div variants={itemVariants} className="mb-4">
              <Input
                label="Email"
                id="register-email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                placeholder="you@example.com"
                error={touched.email ? errors.email : undefined}
                labelStyle={fieldLabelStyle}
                inputStyle={fieldInputStyle}
                className="placeholder:text-white/40"
              />
            </motion.div>

            {/* Password Field */}
            <motion.div variants={itemVariants} className="mb-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label
                  htmlFor="register-password"
                  className="text-sm font-medium"
                  style={{ color: '#ffffff' }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange('password')}
                    onBlur={handleBlur('password')}
                    placeholder="At least 8 characters"
                    aria-invalid={touched.password && !!errors.password ? true : undefined}
                    aria-describedby={
                      touched.password && errors.password
                        ? 'register-password-error'
                        : undefined
                    }
                    className="w-full rounded-lg px-3 py-2 pr-11 text-sm border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'rgba(7, 23, 18, 0.96)',
                      color: '#ffffff',
                      borderColor:
                        touched.password && errors.password
                          ? 'var(--color-error)'
                          : 'rgba(52, 211, 153, 0.34)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid var(--color-primary)';
                      e.currentTarget.style.outlineOffset = '0px';
                    }}
                    onBlurCapture={(e) => {
                      e.currentTarget.style.outline = '';
                      e.currentTarget.style.outlineOffset = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <motion.p
                    id="register-password-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="text-xs"
                    style={{ color: 'var(--color-error)' }}
                  >
                    {errors.password}
                  </motion.p>
                )}
              </div>
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="flex flex-col gap-1.5 w-full">
                <label
                  htmlFor="register-confirmPassword"
                  className="text-sm font-medium"
                  style={{ color: '#ffffff' }}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="register-confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    onBlur={handleBlur('confirmPassword')}
                    placeholder="Re-enter your password"
                    aria-invalid={
                      touched.confirmPassword && !!errors.confirmPassword ? true : undefined
                    }
                    aria-describedby={
                      touched.confirmPassword && errors.confirmPassword
                        ? 'register-confirmPassword-error'
                        : undefined
                    }
                    className="w-full rounded-lg px-3 py-2 pr-11 text-sm border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'rgba(7, 23, 18, 0.96)',
                      color: '#ffffff',
                      borderColor:
                        touched.confirmPassword && errors.confirmPassword
                          ? 'var(--color-error)'
                          : 'rgba(52, 211, 153, 0.34)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid var(--color-primary)';
                      e.currentTarget.style.outlineOffset = '0px';
                    }}
                    onBlurCapture={(e) => {
                      e.currentTarget.style.outline = '';
                      e.currentTarget.style.outlineOffset = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <motion.p
                    id="register-confirmPassword-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="text-xs"
                    style={{ color: 'var(--color-error)' }}
                  >
                    {errors.confirmPassword}
                  </motion.p>
                )}
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || !isFormValid()}
                className="w-full !bg-[#34d399] !text-[#04110d] hover:!bg-[#6ee7b7]"
              >
                Create Account
              </Button>
            </motion.div>

            {/* Link to Login */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-center text-sm"
              style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}
              >
                Sign in
              </Link>
            </motion.p>
          </motion.form>
        </Card>
      </motion.div>
    </div>
  );
}
