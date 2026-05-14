import { motion } from 'framer-motion';
import type {
  ExpertiseLevel,
  MaterialAvailability,
  Motivation,
  StructuredUserContext,
  TimeCommitment,
} from '@resource-ai/shared';
import { BookOpen, ChevronDown, Clock, Lightbulb, Wrench } from 'lucide-react';

export interface StructuredContextInputProps {
  value: Partial<StructuredUserContext>;
  onChange: (context: Partial<StructuredUserContext>) => void;
}

// ── Option definitions ────────────────────────────────────────────────────────

const EXPERTISE_OPTIONS: ExpertiseLevel[] = ['Beginner', 'Intermediate', 'Expert'];

const MOTIVATION_OPTIONS: Motivation[] = [
  'Learn Something New',
  'Environmental Impact',
  'Save Money',
  'Creative Project',
];

const MATERIAL_OPTIONS: MaterialAvailability[] = [
  'Basic Household Tools',
  'Some Electronics Tools',
  'Full Workshop',
];

const TIME_OPTIONS: TimeCommitment[] = [
  'Under 1 Hour',
  '1-3 Hours',
  'Half Day',
  'Multi-Day Project',
];

// ── Sub-components ────────────────────────────────────────────────────────────

interface SegmentedButtonGroupProps<T extends string> {
  id: string;
  options: T[];
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel: string;
}

function SegmentedButtonGroup<T extends string>({
  id,
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedButtonGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex rounded-xl overflow-hidden border border-border-subtle"
    >
      {options.map((option, index) => {
        const isSelected = value === option;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <button
            key={option}
            type="button"
            id={`${id}-${option.replace(/\s+/g, '-').toLowerCase()}`}
            aria-pressed={isSelected}
            onClick={() => onChange(option)}
            className={[
              'flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-inset',
              !isFirst && 'border-l border-border-subtle',
              isFirst && 'rounded-l-xl',
              isLast && 'rounded-r-xl',
              isSelected
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                : 'bg-stone-100 text-text-secondary hover:bg-stone-200 hover:text-text-primary',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface ChipSelectProps<T extends string> {
  id: string;
  options: T[];
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel: string;
}

function ChipSelect<T extends string>({
  id,
  options,
  value,
  onChange,
  ariaLabel,
}: ChipSelectProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const isSelected = value === option;

        return (
          <button
            key={option}
            type="button"
            id={`${id}-${option.replace(/\s+/g, '-').toLowerCase()}`}
            aria-pressed={isSelected}
            onClick={() => onChange(option)}
            className={[
              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
              isSelected
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/40 shadow-sm shadow-primary-500/10'
                : 'bg-stone-100 text-text-secondary border-border-subtle hover:bg-stone-200 hover:text-text-primary hover:border-primary-500/30',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

interface FieldWrapperProps {
  label: string;
  icon: React.ReactNode;
  description: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({ label, icon, description, htmlFor, required, children }: FieldWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-5"
    >
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 mb-1.5"
      >
        <span className="text-text-muted">{icon}</span>
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {required && (
          <span className="text-danger-500 text-xs" aria-label="required">
            *
          </span>
        )}
      </label>
      <p className="text-xs text-text-muted mb-2 ml-6">{description}</p>
      {children}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StructuredContextInput({ value, onChange }: StructuredContextInputProps) {
  const handleExpertiseChange = (level: ExpertiseLevel) => {
    onChange({ ...value, expertiseLevel: level });
  };

  const handleMotivationChange = (motivation: Motivation) => {
    onChange({ ...value, motivation });
  };

  const handleMaterialChange = (materialAvailability: MaterialAvailability) => {
    onChange({ ...value, materialAvailability });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timeCommitment = e.target.value as TimeCommitment;
    onChange({ ...value, timeCommitment });
  };

  return (
    <div className="space-y-1">
      {/* Expertise Level */}
      <FieldWrapper
        label="Expertise Level"
        icon={<BookOpen className="w-4 h-4" />}
        description="Your experience with electronics and DIY projects"
        required
      >
        <SegmentedButtonGroup
          id="expertise"
          options={EXPERTISE_OPTIONS}
          value={value.expertiseLevel}
          onChange={handleExpertiseChange}
          ariaLabel="Expertise level"
        />
      </FieldWrapper>

      {/* Motivation */}
      <FieldWrapper
        label="Motivation"
        icon={<Lightbulb className="w-4 h-4" />}
        description="What's driving your interest in this project?"
        required
      >
        <ChipSelect
          id="motivation"
          options={MOTIVATION_OPTIONS}
          value={value.motivation}
          onChange={handleMotivationChange}
          ariaLabel="Motivation"
        />
      </FieldWrapper>

      {/* Material Availability */}
      <FieldWrapper
        label="Material Availability"
        icon={<Wrench className="w-4 h-4" />}
        description="What tools and equipment do you have access to?"
        required
      >
        <SegmentedButtonGroup
          id="material"
          options={MATERIAL_OPTIONS}
          value={value.materialAvailability}
          onChange={handleMaterialChange}
          ariaLabel="Material availability"
        />
      </FieldWrapper>

      {/* Time Commitment */}
      <FieldWrapper
        label="Time Commitment"
        icon={<Clock className="w-4 h-4" />}
        description="How much time can you dedicate to this project?"
        htmlFor="time-commitment"
        required
      >
        <div className="relative">
          <select
            id="time-commitment"
            value={value.timeCommitment ?? ''}
            onChange={handleTimeChange}
            className={[
              'w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm transition-all duration-200',
              'bg-stone-50 border border-border-subtle',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/40',
              value.timeCommitment ? 'text-text-primary' : 'text-text-muted',
            ].join(' ')}
            aria-label="Time commitment"
          >
            <option value="" disabled>
              Select time commitment…
            </option>
            {TIME_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-surface-card text-text-primary">
                {option}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            aria-hidden="true"
          />
        </div>
      </FieldWrapper>
    </div>
  );
}

export default StructuredContextInput;
