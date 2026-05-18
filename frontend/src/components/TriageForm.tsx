import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MAX_FIELD_LENGTH } from '@resource-ai/shared';
import type { StructuredUserContext } from '@resource-ai/shared';
import { Cpu, AlertTriangle, Send, Zap } from 'lucide-react';
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

  // Count completed sections for progress
  const completedSections = [
    isFieldValid(deviceIdentity),
    isFieldValid(failureSymptoms),
    isContextComplete(userContext),
  ].filter(Boolean).length;

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
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
              }}
            >
              <Zap className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden />
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {TRIAGE_CONTENT.title}
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {TRIAGE_CONTENT.subtitle}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: step < completedSections
                    ? 'var(--color-primary)'
                    : 'var(--color-border-default)',
                }}
                role="presentation"
              />
            ))}
            <span
              className="text-xs font-medium ml-2 tabular-nums"
              style={{ color: completedSections === 3 ? 'var(--color-success)' : 'var(--color-text-muted)' }}
            >
              {completedSections}/3
            </span>
          </div>
        </motion.div>

        {/* Section 1: Device Description */}
        <motion.section variants={itemVariants} className="mb-6">
          <TintedPanel className="p-5" tone="default">
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
                        style={{ color: isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                      >
                        {field.icon}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
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
                    <p className="text-xs mb-2 ml-6" style={{ color: 'var(--color-text-muted)' }}>
                      {field.description}
                    </p>
                    <textarea
                      id={`triage-${field.name}`}
                      className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-none border transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--color-text-muted)]"
                      style={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-primary)',
                        borderColor: isFocused ? 'var(--color-primary)' : 'var(--color-border-default)',
                        boxShadow: isFocused ? '0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'none',
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
                        style={{ color: charCount >= MAX_FIELD_LENGTH ? 'var(--color-error)' : 'var(--color-text-muted)' }}
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
          <TintedPanel className="p-5" tone="default">
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
            <TintedPanel className="p-5" tone="default">
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
              style={{ color: 'var(--color-text-muted)' }}
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
