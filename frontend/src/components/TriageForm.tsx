import React, { useState, useCallback } from 'react';
import { MAX_FIELD_LENGTH } from '@resource-ai/shared';
import './TriageForm.css';

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
}

const FIELDS: FieldConfig[] = [
  {
    name: 'deviceIdentity',
    label: 'Device Identity and Visible Parts',
    placeholder:
      'e.g., Samsung Galaxy S10, cracked screen, visible battery bulge...',
  },
  {
    name: 'failureSymptoms',
    label: 'Failure and Safety Symptoms',
    placeholder:
      'e.g., Won\'t turn on, overheating, smoke smell, broken charging port...',
  },
  {
    name: 'userContext',
    label: 'User Context and Goal',
    placeholder:
      'e.g., Beginner, have basic tools, want to salvage the camera module...',
  },
];

export function TriageForm({ onSubmit, fileUploader, disabled }: TriageFormProps) {
  const [formData, setFormData] = useState<TriageFormData>({
    deviceIdentity: '',
    failureSymptoms: '',
    userContext: '',
  });

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

  const isFieldValid = (value: string): boolean => {
    return value.trim().length > 0;
  };

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
    <form className="triage-form" onSubmit={handleSubmit} noValidate>
      <h2 className="triage-form__title">E-Waste Device Triage</h2>

      {FIELDS.map((field) => {
        const value = formData[field.name];
        const charCount = value.length;
        const fieldValid = isFieldValid(value);
        const showError = value.length > 0 && !fieldValid;

        return (
          <div className="triage-form__field" key={field.name}>
            <label
              className="triage-form__label"
              htmlFor={`triage-${field.name}`}
            >
              {field.label}
              <span className="triage-form__required" aria-label="required">
                {' '}
                *
              </span>
            </label>
            <textarea
              id={`triage-${field.name}`}
              className={`triage-form__textarea ${showError ? 'triage-form__textarea--error' : ''}`}
              name={field.name}
              value={value}
              onChange={handleChange(field.name)}
              placeholder={field.placeholder}
              required
              maxLength={MAX_FIELD_LENGTH}
              rows={4}
              aria-describedby={`${field.name}-counter`}
              aria-invalid={showError ? 'true' : undefined}
              disabled={disabled}
            />
            <div className="triage-form__meta">
              {showError && (
                <span className="triage-form__error" role="alert">
                  This field is required
                </span>
              )}
              <span
                id={`${field.name}-counter`}
                className={`triage-form__counter ${charCount >= MAX_FIELD_LENGTH ? 'triage-form__counter--limit' : ''}`}
                aria-live="polite"
              >
                {charCount}/{MAX_FIELD_LENGTH}
              </span>
            </div>
          </div>
        );
      })}

      {fileUploader && (
        <div className="triage-form__file-uploader">{fileUploader}</div>
      )}

      <button
        type="submit"
        className="triage-form__submit"
        disabled={!isFormValid || disabled}
      >
        Submit for Triage
      </button>
    </form>
  );
}

export default TriageForm;
