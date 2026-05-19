import { motion } from 'framer-motion';
import type {
  ExpertiseLevel,
  MaterialAvailability,
  Motivation,
  StructuredUserContext,
  TimeCommitment,
} from '@resource-ai/shared';
import {
  BookOpen,
  Clock,
  Lightbulb,
  Wrench,
  GraduationCap,
  Zap,
  Leaf,
  PiggyBank,
  Palette,
  Hammer,
  Settings,
  Timer,
  Coffee,
  CalendarDays,
} from 'lucide-react';

export interface StructuredContextInputProps {
  value: Partial<StructuredUserContext>;
  onChange: (context: Partial<StructuredUserContext>) => void;
}

// ── Option definitions with icons ─────────────────────────────────────────────

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: 'Beginner',     label: 'Beginner',      icon: <BookOpen className="w-3.5 h-3.5" />,      hint: 'New to DIY' },
  { value: 'Intermediate', label: 'Intermediate',   icon: <GraduationCap className="w-3.5 h-3.5" />, hint: 'Some experience' },
  { value: 'Expert',       label: 'Expert',         icon: <Zap className="w-3.5 h-3.5" />,           hint: 'Seasoned builder' },
];

const MOTIVATION_OPTIONS: { value: Motivation; label: string; icon: React.ReactNode }[] = [
  { value: 'Learn Something New',  label: 'Learn',       icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { value: 'Environmental Impact', label: 'Eco Impact',  icon: <Leaf className="w-3.5 h-3.5" /> },
  { value: 'Save Money',           label: 'Save Money',  icon: <PiggyBank className="w-3.5 h-3.5" /> },
  { value: 'Creative Project',     label: 'Creative',    icon: <Palette className="w-3.5 h-3.5" /> },
];

const MATERIAL_OPTIONS: { value: MaterialAvailability; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: 'Basic Household Tools',   label: 'Basic',     icon: <Hammer className="w-3.5 h-3.5" />,   hint: 'Screwdrivers, pliers' },
  { value: 'Some Electronics Tools',  label: 'Electronics', icon: <Settings className="w-3.5 h-3.5" />, hint: 'Multimeter, soldering' },
  { value: 'Full Workshop',           label: 'Workshop',  icon: <Wrench className="w-3.5 h-3.5" />,   hint: 'Full toolkit' },
];

const TIME_OPTIONS: { value: TimeCommitment; label: string; icon: React.ReactNode }[] = [
  { value: 'Under 1 Hour',      label: '< 1 Hour',   icon: <Timer className="w-3.5 h-3.5" /> },
  { value: '1-3 Hours',         label: '1–3 Hours',  icon: <Coffee className="w-3.5 h-3.5" /> },
  { value: 'Half Day',          label: 'Half Day',   icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'Multi-Day Project', label: 'Multi-Day',  icon: <CalendarDays className="w-3.5 h-3.5" /> },
];

// ── Pill chip component ───────────────────────────────────────────────────────

interface PillChipProps {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  id: string;
}

function PillChip({ label, hint, icon, isSelected, onClick, id }: PillChipProps) {
  return (
    <motion.button
      key={id}
      type="button"
      id={id}
      aria-pressed={isSelected}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="relative flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus-visible:ring-2 cursor-pointer select-none"
      style={{
        backgroundColor: isSelected
          ? 'rgba(52, 211, 153, 0.14)'
          : 'rgba(7, 23, 18, 0.9)',
        borderColor: isSelected
          ? 'rgba(52, 211, 153, 0.48)'
          : 'rgba(255, 255, 255, 0.2)',
        color: isSelected ? '#34d399' : 'rgba(255, 255, 255, 0.84)',
        boxShadow: isSelected
          ? '0 0 0 1px rgba(52, 211, 153, 0.22)'
          : 'none',
      }}
    >
      {/* Selected dot indicator */}
      {isSelected && (
        <motion.span
          layoutId={undefined}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] as const }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            backgroundColor: 'rgba(52, 211, 153, 0.08)',
          }}
        />
      )}
      <span className="relative flex items-center gap-2">
        <span
          style={{
            color: isSelected ? '#34d399' : 'rgba(255, 255, 255, 0.62)',
          }}
        >
          {icon}
        </span>
        <span>{label}</span>
        {hint && (
          <span
            className="hidden sm:inline text-xs font-normal"
            style={{ color: isSelected ? 'rgba(52, 211, 153, 0.8)' : 'rgba(255,255,255,0.58)' }}
          >
            · {hint}
          </span>
        )}
      </span>
    </motion.button>
  );
}

// ── Field section ─────────────────────────────────────────────────────────────

interface FieldSectionProps {
  label: string;
  icon: React.ReactNode;
  description: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldSection({ label, icon, description, required, children }: FieldSectionProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{icon}</span>
          <span className="text-sm font-medium" style={{ color: '#ffffff' }}>
            {label}
          </span>
          {required && (
            <span className="text-xs" style={{ color: 'var(--color-error)' }} aria-hidden="true">
              *
            </span>
          )}
        </div>
        <p className="text-xs ml-6" style={{ color: 'rgba(255, 255, 255, 0.66)' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StructuredContextInput({ value, onChange }: StructuredContextInputProps) {
  return (
    <div className="space-y-5">
      {/* Expertise Level */}
      <FieldSection
        label="Expertise Level"
        icon={<BookOpen className="w-4 h-4" />}
        description="Your experience with electronics and DIY projects"
        required
      >
        <div
          role="group"
          aria-label="Expertise level"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {EXPERTISE_OPTIONS.map((opt) => (
            <PillChip
              key={opt.value}
              id={`expertise-${opt.value.toLowerCase()}`}
              label={opt.label}
              hint={opt.hint}
              icon={opt.icon}
              isSelected={value.expertiseLevel === opt.value}
              onClick={() => onChange({ ...value, expertiseLevel: opt.value })}
            />
          ))}
        </div>
      </FieldSection>

      {/* Motivation */}
      <FieldSection
        label="Motivation"
        icon={<Lightbulb className="w-4 h-4" />}
        description="What's driving your interest in this project?"
        required
      >
        <div
          role="group"
          aria-label="Motivation"
          className="grid grid-cols-2 gap-2"
        >
          {MOTIVATION_OPTIONS.map((opt) => (
            <PillChip
              key={opt.value}
              id={`motivation-${opt.value.replace(/\s+/g, '-').toLowerCase()}`}
              label={opt.label}
              icon={opt.icon}
              isSelected={value.motivation === opt.value}
              onClick={() => onChange({ ...value, motivation: opt.value })}
            />
          ))}
        </div>
      </FieldSection>

      {/* Material Availability */}
      <FieldSection
        label="Material Availability"
        icon={<Wrench className="w-4 h-4" />}
        description="What tools and equipment do you have access to?"
        required
      >
        <div
          role="group"
          aria-label="Material availability"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {MATERIAL_OPTIONS.map((opt) => (
            <PillChip
              key={opt.value}
              id={`material-${opt.value.replace(/\s+/g, '-').toLowerCase()}`}
              label={opt.label}
              hint={opt.hint}
              icon={opt.icon}
              isSelected={value.materialAvailability === opt.value}
              onClick={() => onChange({ ...value, materialAvailability: opt.value })}
            />
          ))}
        </div>
      </FieldSection>

      {/* Time Commitment */}
      <FieldSection
        label="Time Commitment"
        icon={<Clock className="w-4 h-4" />}
        description="How much time can you dedicate to this project?"
        required
      >
        <div
          role="group"
          aria-label="Time commitment"
          className="grid grid-cols-2 gap-2"
        >
          {TIME_OPTIONS.map((opt) => (
            <PillChip
              key={opt.value}
              id={`time-${opt.value.replace(/\s+/g, '-').toLowerCase()}`}
              label={opt.label}
              icon={opt.icon}
              isSelected={value.timeCommitment === opt.value}
              onClick={() => onChange({ ...value, timeCommitment: opt.value })}
            />
          ))}
        </div>
      </FieldSection>
    </div>
  );
}

export default StructuredContextInput;
