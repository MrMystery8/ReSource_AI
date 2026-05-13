import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MAX_FIELD_LENGTH } from '@resource-ai/shared';
import { Cpu, AlertTriangle, User, Send, Sparkles } from 'lucide-react';

export interface TriageFormData {
  deviceIdentity: string;
  failureSymptoms: string;
  userContext: string;
}

export interface TriageFormProps {
  onSubmit: (data: TriageFormData) => void;
  fileUploader?: React.ReactNode;
  disabled?: boolean;
}

interface FieldConfig {
  name: keyof TriageFormData;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  description: string;
}

const FIELDS: FieldConfig[] = [
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
  {
    name: 'userContext',
    label: 'Your Context & Goal',
    placeholder: 'e.g., Beginner, have basic tools, want to salvage the camera module...',
    icon: <User className="w-4 h-4" />,
    description: 'Your skill level and what you hope to achieve',
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
  const [formData, setFormData] = useState<TriageFormData>({
    deviceIdentity: '',
    failureSymptoms: '',
    userContext: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof TriageFormData) =>
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value.length <= MAX_FIELD_LENGTH) {
          setFormData((prev) => ({ ...prev, [field]: value }));
        }
      },
    []
  );

  const isFieldValid = (value: string): boolean => value.trim().length > 0;

  const isFormValid =
    isFieldValid(formData.deviceIdentity) &&
    isFieldValid(formData.failureSymptoms) &&
    isFieldValid(formData.userContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && !disabled) {
      onSubmit(formData);
    }
  };

  return (
    <motion.form
      className="glass-card p-6 sm:p-8 max-w-2xl mx-auto"
      onSubmit={handleSubmit}
      noValidate
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Form Header */}
      <motion.div variants={itemVariants} className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-xs font-medium text-primary-300">AI-Powered Analysis</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
          E-Waste Device Triage
        </h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Describe your device and we'll analyze its salvage potential, safety risks, and second-life opportunities.
        </p>
      </motion.div>

      {/* Form Fields */}
      {FIELDS.map((field) => {
        const value = formData[field.name];
        const charCount = value.length;
        const isFocused = focusedField === field.name;
        const hasValue = value.trim().length > 0;

        return (
          <motion.div
            key={field.name}
            variants={itemVariants}
            className="mb-5"
          >
            <label
              htmlFor={`triage-${field.name}`}
              className="flex items-center gap-2 mb-2"
            >
              <span className={`transition-colors duration-200 ${isFocused ? 'text-primary-400' : 'text-text-muted'}`}>
                {field.icon}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {field.label}
              </span>
              <span className="text-rose-400 text-xs" aria-label="required">*</span>
            </label>
            <p className="text-xs text-text-muted mb-2 ml-6">{field.description}</p>
            <div className={`relative rounded-xl transition-all duration-300 ${
              isFocused
                ? 'ring-2 ring-primary-500/50 shadow-lg shadow-primary-500/10'
                : 'ring-1 ring-border-subtle'
            }`}>
              <textarea
                id={`triage-${field.name}`}
                className="w-full bg-surface-elevated/50 text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                name={field.name}
                value={value}
                onChange={handleChange(field.name)}
                onFocus={() => setFocusedField(field.name)}
                onBlur={() => setFocusedField(null)}
                placeholder={field.placeholder}
                required
                maxLength={MAX_FIELD_LENGTH}
                rows={3}
                aria-describedby={`${field.name}-counter`}
                disabled={disabled}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 px-1">
              {hasValue && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-emerald-400"
                >
                  ✓
                </motion.span>
              )}
              <span
                id={`${field.name}-counter`}
                className={`text-xs ml-auto ${
                  charCount >= MAX_FIELD_LENGTH ? 'text-rose-400' : 'text-text-muted'
                }`}
                aria-live="polite"
              >
                {charCount}/{MAX_FIELD_LENGTH}
              </span>
            </div>
          </motion.div>
        );
      })}

      {/* File Uploader */}
      {fileUploader && (
        <motion.div variants={itemVariants} className="mb-6">
          {fileUploader}
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.div variants={itemVariants}>
        <motion.button
          type="submit"
          disabled={!isFormValid || disabled}
          className="w-full relative overflow-hidden rounded-xl px-6 py-3.5 font-medium text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
          whileHover={isFormValid && !disabled ? { scale: 1.01 } : {}}
          whileTap={isFormValid && !disabled ? { scale: 0.99 } : {}}
        >
          {/* Button gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />

          <span className="relative flex items-center justify-center gap-2">
            {disabled ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Analyze Device</span>
              </>
            )}
          </span>
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

export default TriageForm;
