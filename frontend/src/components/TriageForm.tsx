import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MAX_FIELD_LENGTH } from '@resource-ai/shared';
import type { StructuredUserContext } from '@resource-ai/shared';
import { Cpu, AlertTriangle, Send, Leaf } from 'lucide-react';
import { StructuredContextInput } from './StructuredContextInput';
import { Button } from './ui/Button';
import { NumberedSectionHeading, TintedPanel } from './ui/analysis-primitives';
import { TRIAGE_CONTENT } from '../design-system/content';

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
    placeholder: 'e.g., Samsung Galaxy S10, Dell Inspiron 15, iPhone 12 Pro...',
    icon: <Cpu className="w-4 h-4" />,
    description: 'Identify the device model, brand, or variant only',
  },
  {
    name: 'failureSymptoms',
    label: 'Failure Symptoms',
    placeholder: "e.g., Won't turn on, overheating, smoke smell, broken charging port...",
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Describe damage, faults, symptoms, and any safety concerns',
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

  const isDetailsComplete = isFieldValid(deviceIdentity) && isFieldValid(failureSymptoms);
  const activeStepIndex = !isDetailsComplete ? 0 : !isContextComplete(userContext) ? 1 : 2;

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
          <div className="mb-2">
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Leaf className="w-6 h-6" style={{ color: 'var(--color-primary)' }} aria-hidden />
              {TRIAGE_CONTENT.title}
            </h1>
            <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {TRIAGE_CONTENT.subtitle}
            </p>
          </div>

          <div className="py-3">
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
                          backgroundColor: isActive || isCompleted ? '#34d399' : 'rgba(255,255,255,0.08)',
                          border: isActive || isCompleted ? '1px solid transparent' : '1px solid rgba(255,255,255,0.25)',
                          color: isActive || isCompleted ? '#052e16' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {index + 1}
                      </div>
                      <span className="mt-2 text-[11px] font-medium" style={{ color: isActive ? '#34d399' : 'rgba(255,255,255,0.44)' }}>
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className="mt-[15px] h-[2px] flex-1 rounded-full transition-colors duration-300"
                        style={{ backgroundColor: isCompleted ? '#34d399' : 'rgba(255,255,255,0.2)' }}
                        role="presentation"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Section 1: Device Description */}
        <motion.section variants={itemVariants} className="mb-6">
          <TintedPanel className="p-5" tone="primary">
            <NumberedSectionHeading step={1} title="Device Details" />

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
                        style={{ color: isFocused ? '#34d399' : 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {field.icon}
                      </span>
                      <span className="text-sm font-medium" style={{ color: '#ffffff' }}>
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
                    <p className="text-xs mb-2 ml-6" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                      {field.description}
                    </p>
                    <textarea
                      id={`triage-${field.name}`}
                      className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-none border transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--color-text-muted)]"
                      style={{
                        backgroundColor: 'rgba(7, 23, 18, 0.96)',
                        color: 'rgba(255,255,255,0.92)',
                        borderColor: isFocused ? 'rgba(52, 211, 153, 0.72)' : 'rgba(52, 211, 153, 0.34)',
                        boxShadow: isFocused ? '0 0 0 2px rgba(52, 211, 153, 0.2)' : 'none',
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
                        style={{ color: charCount >= MAX_FIELD_LENGTH ? 'var(--color-error)' : 'rgba(255, 255, 255, 0.64)' }}
                        aria-live="polite"
                      >
                        {charCount}/{MAX_FIELD_LENGTH}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TintedPanel>
        </motion.section>

        {/* Section 2: Your Context */}
        <motion.section variants={itemVariants} className="mb-6">
          <TintedPanel className="p-5" tone="primary">
            <NumberedSectionHeading step={2} title="Your Context" />

            <StructuredContextInput
              value={userContext}
              onChange={setUserContext}
            />
          </TintedPanel>
        </motion.section>

        {/* Section 3: Evidence Upload */}
        {fileUploader && (
          <motion.section variants={itemVariants} className="mb-8">
            <TintedPanel className="p-5" tone="primary">
              <NumberedSectionHeading step={3} title="Evidence Photos" subtitle="Optional" />

              {fileUploader}
            </TintedPanel>
          </motion.section>
        )}

        {/* Submit Button */}
        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!isFormValid || disabled}
            isLoading={disabled}
            leftIcon={!disabled ? <Send className="w-4 h-4" /> : undefined}
          >
            {disabled ? TRIAGE_CONTENT.submitLoadingLabel : TRIAGE_CONTENT.submitIdleLabel}
          </Button>

          {!isFormValid && !disabled && (
            <p
              className="text-xs text-center mt-2"
              style={{ color: 'rgba(255, 255, 255, 0.72)' }}
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
