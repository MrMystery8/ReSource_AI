import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MAX_FIELD_LENGTH } from '@resource-ai/shared';
import type { StructuredUserContext } from '@resource-ai/shared';
import { Cpu, AlertTriangle, Send, Zap } from 'lucide-react';
import { StructuredContextInput } from './StructuredContextInput';
import { Button } from './ui/Button';

export interface TriageFormData {
  deviceIdentity: string;
  failureSymptoms: string;
  userContext: StructuredUserContext;
}

export interface TriageFormProps {
  onSubmit: (data: TriageFormData) => void;
  fileUploader?: React.ReactNode;
  disabled?: boolean;
}

interface TextFieldConfig {
  name: 'deviceIdentity' | 'failureSymptoms';
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  description: string;
}

interface ProgressStep {
  key: 'details' | 'context' | 'upload';
  label: string;
}

const TEXT_FIELDS: TextFieldConfig[] = [
  {
    name: 'deviceIdentity',
    label: 'Device Identity',
    placeholder: 'e.g., Samsung Galaxy S10, cracked screen, visible battery bulge...',
    icon: <Cpu className="w-4 h-4" />,
    description: 'Describe the device and any visible parts or damage',
  },
  {
    name: 'failureSymptoms',
    label: 'Failure Symptoms',
    placeholder: "e.g., Won't turn on, overheating, smoke smell, broken charging port...",
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'What went wrong? Any safety concerns?',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as const } },
};

const EMERALD = '#34d399';
const ACCENT_WHITE = '#ffffff';
const BODY_WHITE = 'rgba(255,255,255,0.9)';
const MUTED_WHITE = 'rgba(255,255,255,0.35)';
const PANEL_STYLE: React.CSSProperties = {
  backgroundColor: '#000000',
  borderColor: 'rgba(52, 211, 153, 0.58)',
  borderWidth: '2px',
  boxShadow: [
    'inset 0 0 0 1px rgba(52, 211, 153, 0.10)',
    '0 0 0 1px rgba(52, 211, 153, 0.22)',
    '0 0 12px rgba(52, 211, 153, 0.18)',
    '0 0 28px rgba(16, 185, 129, 0.10)',
    '0 18px 54px rgba(0, 0, 0, 0.42)',
  ].join(', '),
};
const PROGRESS_STEPS: readonly ProgressStep[] = [
  { key: 'details', label: 'Details' },
  { key: 'context', label: 'Context' },
  { key: 'upload', label: 'Upload' },
] as const;

export function TriageForm({ onSubmit, fileUploader, disabled }: TriageFormProps) {
  const [deviceIdentity, setDeviceIdentity] = useState('');
  const [failureSymptoms, setFailureSymptoms] = useState('');
  const [userContext, setUserContext] = useState<Partial<StructuredUserContext>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleTextChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value.length <= MAX_FIELD_LENGTH) {
          setter(value);
        }
      },
    []
  );

  const isFieldValid = (value: string): boolean => value.trim().length > 0;

  const isContextComplete = (ctx: Partial<StructuredUserContext>): boolean =>
    ctx.expertiseLevel != null &&
    ctx.motivation != null &&
    ctx.materialAvailability != null &&
    ctx.timeCommitment != null;

  const isFormValid =
    isFieldValid(deviceIdentity) &&
    isFieldValid(failureSymptoms) &&
    isContextComplete(userContext);

  const isDetailsComplete =
    isFieldValid(deviceIdentity) &&
    isFieldValid(failureSymptoms);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && !disabled) {
      onSubmit({
        deviceIdentity,
        failureSymptoms,
        userContext: userContext as StructuredUserContext,
      });
    }
  };

  const activeStepIndex = !isDetailsComplete
    ? 0
    : !isContextComplete(userContext)
      ? 1
      : 2;

  return (
    <motion.div
      className="max-w-3xl mx-auto pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '2px solid rgba(255, 255, 255, 0.26)',
                boxShadow: '0 0 18px rgba(255, 255, 255, 0.12), 0 0 36px rgba(255, 255, 255, 0.06)',
              }}
            >
              <Zap className="h-7 w-7 sm:h-8 sm:w-8" style={{ color: ACCENT_WHITE }} aria-hidden />
            </div>
            <div>
              <h1
                className="text-4xl font-bold tracking-tight sm:text-5xl"
                style={{
                  color: '#ffffff',
                  textShadow: '0 0 12px rgba(255, 255, 255, 0.20)',
                }}
              >
                Device Triage
              </h1>
              <p
                className="text-base leading-relaxed sm:text-lg"
                style={{
                  color: EMERALD,
                  textShadow: '0 0 10px rgba(52, 211, 153, 0.22), 0 0 24px rgba(52, 211, 153, 0.12)',
                }}
              >
                Analyze salvage potential, safety risks, and second-life ideas
              </p>
            </div>
          </div>

        </motion.div>

        {/* Stepped Progress Indicator */}
        <motion.div variants={itemVariants} className="py-4">
          <div className="flex items-start">
            {PROGRESS_STEPS.map((step, index) => {
              const isActive = index === activeStepIndex;
              const isCompleted = index < activeStepIndex;
              const isLast = index === PROGRESS_STEPS.length - 1;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center min-w-[64px]">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
                      style={{
                        backgroundColor: isActive || isCompleted
                          ? EMERALD
                          : 'rgba(255,255,255,0.08)',
                        border: isActive || isCompleted
                          ? '1px solid transparent'
                          : '1px solid rgba(255,255,255,0.25)',
                        color: isActive || isCompleted
                          ? '#052e16'
                          : 'rgba(255,255,255,0.4)',
                        boxShadow: isActive
                          ? '0 0 8px rgba(52,211,153,0.5)'
                          : isCompleted
                            ? '0 0 6px rgba(52,211,153,0.26)'
                            : 'none',
                      }}
                    >
                      {index + 1}
                    </div>
                    <span
                      className="mt-2 text-[11px] font-medium"
                      style={{ color: isActive ? EMERALD : MUTED_WHITE }}
                    >
                      {step.label}
                    </span>
                  </div>

                  {!isLast && (
                    <div
                      className="mt-[15px] h-[2px] flex-1 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor: isCompleted
                          ? EMERALD
                          : 'rgba(255,255,255,0.2)',
                      }}
                      role="presentation"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        {/* Section 1: Device Description */}
        <motion.section variants={itemVariants} className="mb-6">
          <div
            className="rounded-xl border p-5"
            style={PANEL_STYLE}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide sm:text-lg"
              style={{ color: EMERALD }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: EMERALD,
                  color: '#000000',
                }}
              >
                1
              </span>
              Device Details
            </h2>

            <div className="space-y-4">
              {TEXT_FIELDS.map((field) => {
                const value = field.name === 'deviceIdentity' ? deviceIdentity : failureSymptoms;
                const setter = field.name === 'deviceIdentity' ? setDeviceIdentity : setFailureSymptoms;
                const charCount = value.length;
                const isFocused = focusedField === field.name;

                return (
                  <div key={field.name}>
                    <label
                      htmlFor={`triage-${field.name}`}
                      className="flex items-center gap-2 mb-1.5"
                    >
                      <span
                        className="transition-colors duration-200"
                        style={{ color: ACCENT_WHITE }}
                      >
                        {field.icon}
                      </span>
                      <span className="text-sm font-medium" style={{ color: ACCENT_WHITE }}>
                        {field.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-error)' }}
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </label>
                    <p
                      className="text-xs mb-2 ml-6"
                      style={{
                        color: EMERALD,
                        textShadow: '0 0 8px rgba(52, 211, 153, 0.18), 0 0 18px rgba(52, 211, 153, 0.08)',
                      }}
                    >
                      {field.description}
                    </p>
                    <textarea
                      id={`triage-${field.name}`}
                      className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-none border transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-white/40"
                      style={{
                        backgroundColor: 'rgba(7, 23, 18, 0.96)',
                        color: BODY_WHITE,
                        borderColor: isFocused ? 'rgba(52, 211, 153, 0.76)' : 'rgba(52, 211, 153, 0.34)',
                        boxShadow: isFocused
                          ? '0 0 0 2px rgba(52, 211, 153, 0.22), 0 0 24px rgba(52, 211, 153, 0.14)'
                          : '0 0 0 1px rgba(52, 211, 153, 0.22), 0 0 18px rgba(52, 211, 153, 0.14), 0 0 34px rgba(52, 211, 153, 0.08)',
                      }}
                      name={field.name}
                      value={value}
                      onChange={handleTextChange(setter)}
                      onFocus={() => setFocusedField(field.name)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={field.placeholder}
                      required
                      maxLength={MAX_FIELD_LENGTH}
                      rows={3}
                      aria-describedby={`${field.name}-counter`}
                      disabled={disabled}
                    />
                    <div className="flex justify-end mt-1 px-1">
                      <span
                        id={`${field.name}-counter`}
                        className="text-xs tabular-nums"
                        style={{ color: charCount >= MAX_FIELD_LENGTH ? 'var(--color-error)' : BODY_WHITE }}
                        aria-live="polite"
                      >
                        {charCount}/{MAX_FIELD_LENGTH}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Section 2: Your Context */}
        <motion.section variants={itemVariants} className="mb-6">
          <div
            className="rounded-xl border p-5"
            style={PANEL_STYLE}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide sm:text-lg"
              style={{ color: EMERALD }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: EMERALD,
                  color: '#000000',
                }}
              >
                2
              </span>
              Your Context
            </h2>

            <StructuredContextInput
              value={userContext}
              onChange={setUserContext}
            />
          </div>
        </motion.section>

        {/* Section 3: Evidence Upload */}
        {fileUploader && (
          <motion.section variants={itemVariants} className="mb-8">
            <div
              className="rounded-xl border p-5"
              style={PANEL_STYLE}
            >
              <h2
                className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide sm:text-lg"
                style={{ color: EMERALD }}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: EMERALD,
                    color: '#000000',
                  }}
                >
                  3
                </span>
                Evidence Photos
                <span className="text-xs font-normal normal-case tracking-normal" style={{ color: BODY_WHITE }}>
                  (optional)
                </span>
              </h2>

              {fileUploader}
            </div>
          </motion.section>
        )}

        {/* Submit Button */}
        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full !bg-[#34d399] !text-black shadow-[0_0_18px_rgba(52,211,153,0.35),0_0_44px_rgba(52,211,153,0.24)] hover:!bg-[#6ee7b7]"
            disabled={!isFormValid || disabled}
            isLoading={disabled}
            leftIcon={!disabled ? <Send className="w-4 h-4" /> : undefined}
          >
            {disabled ? 'Analyzing...' : 'Analyze Device'}
          </Button>

          {!isFormValid && !disabled && (
            <p
              className="text-xs text-center mt-2"
              style={{ color: BODY_WHITE }}
            >
              Complete all required fields to submit
            </p>
          )}
        </motion.div>
      </form>
    </motion.div>
  );
}

export default TriageForm;
