import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
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
          if (!EMAIL_REGEX.test(value)) return 'Enter a valid email address';
          return undefined;
        case 'password':
          if (!value) return 'Password is required';
          if (value.length < 8) return 'Must be at least 8 characters';
          return undefined;
        case 'confirmPassword':
          if (!value) return 'Please confirm your password';
          if (value !== data.password) return 'Passwords do not match';
          return undefined;
        case 'displayName':
          if (!value.trim()) return 'Display name is required';
          if (value.trim().length > 100) return 'Must be 100 characters or less';
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

      if (debounceTimers.current[name]) {
        clearTimeout(debounceTimers.current[name]);
      }

      debounceTimers.current[name] = setTimeout(() => {
        if (touched[name]) {
          const newData = { ...formData, [name]: value };
          const error = validateField(name, value, newData);
          setErrors((prev) => ({ ...prev, [name]: error }));

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

    const allTouched = { email: true, password: true, confirmPassword: true, displayName: true };
    setTouched(allTouched);

    const newErrors: FormErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword),
      displayName: validateField('displayName', formData.displayName),
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some((err) => !!err)) return;

    setIsSubmitting(true);
    setToast(null);

    try {
      await register(formData.email, formData.password, formData.displayName.trim());
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      if (message.toLowerCase().includes('already') || message.includes('409')) {
        setToast('This email is already registered. Try signing in instead.');
      } else {
        setToast(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const inputClass = (fieldName: keyof FormData) =>
    `w-full pl-10 pr-4 py-2.5 rounded-md bg-white border text-text-primary placeholder-text-muted text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100 ${
      touched[fieldName] && errors[fieldName]
        ? 'border-danger-400 focus:border-danger-500'
        : 'border-border-default focus:border-primary-500'
    }`;

  const passwordInputClass = (fieldName: keyof FormData) =>
    `w-full pl-10 pr-10 py-2.5 rounded-md bg-white border text-text-primary placeholder-text-muted text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100 ${
      touched[fieldName] && errors[fieldName]
        ? 'border-danger-400 focus:border-danger-500'
        : 'border-border-default focus:border-primary-500'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-center min-h-[80vh]"
    >
      <div className="card p-8 w-full max-w-sm">
        <form onSubmit={handleSubmit} noValidate>
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-text-primary">Create account</h1>
            <p className="text-sm text-text-secondary mt-1">
              Join ReSource AI and start your recycling journey
            </p>
          </div>

          {/* Server error toast */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2 px-3 py-2.5 rounded-md bg-danger-50 border border-danger-100 text-danger-600 text-sm"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{toast}</span>
              <button type="button" onClick={() => setToast(null)} className="shrink-0 hover:opacity-70" aria-label="Dismiss">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Display Name */}
          <div className="mb-4">
            <label htmlFor="register-displayName" className="block text-sm font-medium text-text-primary mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="register-displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange('displayName')}
                onBlur={handleBlur('displayName')}
                placeholder="Your name"
                maxLength={100}
                autoComplete="name"
                className={inputClass('displayName')}
              />
            </div>
            {touched.displayName && errors.displayName && (
              <p className="mt-1 text-xs text-danger-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.displayName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="register-email" className="block text-sm font-medium text-text-primary mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="register-email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputClass('email')}
              />
            </div>
            {touched.email && errors.email && (
              <p className="mt-1 text-xs text-danger-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <label htmlFor="register-password" className="block text-sm font-medium text-text-primary mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={passwordInputClass('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="mt-1 text-xs text-danger-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-text-primary mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="register-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={passwordInputClass('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-0.5"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            className="w-full py-2.5 rounded-md font-medium text-text-primary bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Create account'
            )}
          </button>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
}
