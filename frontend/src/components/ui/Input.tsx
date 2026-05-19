/**
 * Input.tsx
 *
 * Form input with:
 *   - Visible label positioned above the field (never placeholder-only)
 *   - 1px border using --color-border-default
 *   - Focus ring: 2px outline using primary color
 *   - Error state: red border + error message below field
 *   - Optional helper text below field
 *
 * Validates: Requirements 7.2, 7.7, 8.1, 10.6
 */

import React, { useId } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  labelStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Input({
  label,
  error,
  helperText,
  labelStyle,
  inputStyle,
  id: idProp,
  className = '',
  ...rest
}: InputProps): JSX.Element {
  // Generate a stable unique id if none is provided
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Visible label — always above the field */}
      <label
        htmlFor={inputId}
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-primary)', ...labelStyle }}
      >
        {label}
        {rest.required && (
          <span
            className="ml-1"
            style={{ color: 'var(--color-error)' }}
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>

      {/* Input field */}
      <input
        {...rest}
        id={inputId}
        aria-invalid={hasError || undefined}
        aria-describedby={
          [hasError ? errorId : null, helperText ? helperId : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        className={[
          'w-full rounded-lg px-3 py-2 text-sm',
          'border transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'placeholder:text-[var(--color-text-muted)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundColor: 'var(--color-surface-card)',
          color: 'var(--color-text-primary)',
          borderColor: hasError ? 'var(--color-error)' : 'var(--color-border-default)',
          // Focus ring color applied via CSS custom property trick
          // (Tailwind ring color can't use CSS vars directly in v4 without @theme)
          // We use outline instead for full CSS-var support
          ...inputStyle,
        } as React.CSSProperties}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid var(--color-primary)`;
          e.currentTarget.style.outlineOffset = '0px';
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = '';
          e.currentTarget.style.outlineOffset = '';
          rest.onBlur?.(e);
        }}
      />

      {/* Error message — below field, linked via aria-describedby */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs"
          style={{ color: 'var(--color-error)' }}
        >
          {error}
        </p>
      )}

      {/* Helper text — shown when no error */}
      {!hasError && helperText && (
        <p
          id={helperId}
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

export default Input;
