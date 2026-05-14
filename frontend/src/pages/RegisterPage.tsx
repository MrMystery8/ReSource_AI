import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
        className="glass-card p-8 sm:p-10 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <motion.form
          onSubmit={handleSubmit}
          noValidate
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 glow-primary">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
            <p className="text-sm text-text-secondary mt-1">
              Join ReSource AI and start your recycling journey
            </p>
          </motion.div>

          {/* Toast for server errors */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{toast}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 text-rose-400 hover:text-rose-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Display Name Field */}
          <motion.div variants={itemVariants} className="mb-4">
            <label htmlFor="register-displayName" className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">Display Name</span>
            </label>
            <input
              id="register-displayName"
              type="text"
              value={formData.displayName}
              onChange={handleChange('displayName')}
              onBlur={handleBlur('displayName')}
              placeholder="Your display name"
              maxLength={100}
              className={`w-full px-4 py-3 rounded-lg bg-surface-elevated/50 border text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                touched.displayName && errors.displayName
                  ? 'border-rose-500/50'
                  : 'border-border-subtle focus:border-primary-500/50'
              }`}
            />
            {touched.displayName && errors.displayName && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {errors.displayName}
              </motion.p>
            )}
          </motion.div>

          {/* Email Field */}
          <motion.div variants={itemVariants} className="mb-4">
            <label htmlFor="register-email" className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">Email</span>
            </label>
            <input
              id="register-email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-lg bg-surface-elevated/50 border text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                touched.email && errors.email
                  ? 'border-rose-500/50'
                  : 'border-border-subtle focus:border-primary-500/50'
              }`}
            />
            {touched.email && errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </motion.p>
            )}
          </motion.div>

          {/* Password Field */}
          <motion.div variants={itemVariants} className="mb-4">
            <label htmlFor="register-password" className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">Password</span>
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                placeholder="At least 8 characters"
                className={`w-full px-4 py-3 pr-11 rounded-lg bg-surface-elevated/50 border text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  touched.password && errors.password
                    ? 'border-rose-500/50'
                    : 'border-border-subtle focus:border-primary-500/50'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.password && errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </motion.p>
            )}
          </motion.div>

          {/* Confirm Password Field */}
          <motion.div variants={itemVariants} className="mb-6">
            <label htmlFor="register-confirmPassword" className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">Confirm Password</span>
            </label>
            <div className="relative">
              <input
                id="register-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                placeholder="Re-enter your password"
                className={`w-full px-4 py-3 pr-11 rounded-lg bg-surface-elevated/50 border text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  touched.confirmPassword && errors.confirmPassword
                    ? 'border-rose-500/50'
                    : 'border-border-subtle focus:border-primary-500/50'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {errors.confirmPassword}
              </motion.p>
            )}
          </motion.div>

          {/* Submit Button */}
          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="w-full py-3 px-4 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </motion.div>

          {/* Link to Login */}
          <motion.p variants={itemVariants} className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </motion.p>
        </motion.form>
      </motion.div>
    </div>
  );
}
