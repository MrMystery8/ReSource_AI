import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MAX_FIELD_LENGTH } from '@resource-ai/shared';
import type { StructuredUserContext } from '@resource-ai/shared';
import { Cpu, AlertTriangle, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { StructuredContextInput } from './StructuredContextInput';
import { Card } from './ui/Card';
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
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
  exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
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

  return (
    <motion.div
      className="max-w-2xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Card elevation="md" className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} noValidate>
          {/* Form Header */}
          <motion.div variants={itemVariants} className="mb-8 text-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border-default)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                AI-Powered Analysis
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              E-Waste Device Triage
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              Describe your device and we'll analyze its salvage potential, safety risks, and second-life opportunities.
            </p>
          </motion.div>

          {/* Form Fields */}
          {TEXT_FIELDS.map((field) => {
            const value = field.name === 'deviceIdentity' ? deviceIdentity : failureSymptoms;
            const setter = field.name === 'deviceIdentity' ? setDeviceIdentity : setFailureSymptoms;
            const charCount = value.length;
            const isFocused = focusedField === field.name;
            const hasValue = value.trim().length > 0;

            return (
              <motion.div key={field.name} variants={itemVariants} className="mb-5">
                {/* Visible label above field — requirement 7.2, 10.6 */}
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
                  className="w-full rounded-lg px-3 py-2 text-sm leading-relaxed resize-none border transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--color-text-muted)]"
                  style={{
                    backgroundColor: 'var(--color-surface-card)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-default)',
                    outline: isFocused ? `2px solid var(--color-primary)` : undefined,
                    outlineOffset: '0px',
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
                <div className="flex justify-between items-center mt-1.5 px-1">
                  {hasValue && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="inline-flex items-center"
                      aria-hidden="true"
                    >
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        style={{ color: 'var(--color-success)' }}
                      />
                    </motion.span>
                  )}
                  <span
                    id={`${field.name}-counter`}
                    className="text-xs ml-auto"
                    style={{ color: charCount >= MAX_FIELD_LENGTH ? 'var(--color-error)' : 'var(--color-text-muted)' }}
                    aria-live="polite"
                  >
                    {charCount}/{MAX_FIELD_LENGTH}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Structured User Context */}
          <motion.div variants={itemVariants} className="mb-5">
            <StructuredContextInput
              value={userContext}
              onChange={setUserContext}
            />
          </motion.div>

          {/* File Uploader */}
          {fileUploader && (
            <motion.div variants={itemVariants} className="mb-6">
              {fileUploader}
            </motion.div>
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
              {disabled ? 'Submitting...' : 'Analyze Device'}
            </Button>
          </motion.div>
        </form>
      </Card>
    </motion.div>
  );
}

export default TriageForm;
