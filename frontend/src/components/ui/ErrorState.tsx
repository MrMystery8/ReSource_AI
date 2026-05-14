/**
 * ErrorState.tsx
 *
 * Displayed when a network request or async operation fails.
 *
 * Structure:
 *   - AlertCircle error icon (from lucide-react)
 *   - Message identifying the type of failure
 *   - Retry button that re-initiates the failed request
 *
 * The retry button remains available after subsequent failures (Requirement 8.5).
 * Error status is announced to screen readers via role="alert" (Requirement 10.9).
 *
 * Validates: Requirements 8.4, 8.5, 10.9
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  /** Message identifying the type of failure */
  message?: string;
  /** Callback to re-initiate the failed request */
  onRetry?: () => void;
  /** Label for the retry button (defaults to "Try again") */
  retryLabel?: string;
  /** Whether a retry is currently in progress */
  isRetrying?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  isRetrying = false,
  className = '',
}: ErrorStateProps): JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center gap-4 py-16 px-6 text-center ${className}`}
    >
      {/* Error icon */}
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl"
        style={{
          backgroundColor: 'var(--badge-error-bg, #fef2f2)',
          color: 'var(--color-error)',
        }}
        aria-hidden="true"
      >
        <AlertCircle size={32} strokeWidth={1.5} />
      </div>

      {/* Error message */}
      <div className="flex flex-col gap-1.5 max-w-sm">
        <p
          className="text-base font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Something went wrong
        </p>

        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message}
        </p>
      </div>

      {/* Retry button — always available (Requirement 8.5) */}
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          onClick={onRetry}
          isLoading={isRetrying}
          leftIcon={!isRetrying ? <RefreshCw size={14} aria-hidden="true" /> : undefined}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
