import { motion } from 'framer-motion';
import type { ProjectIdea, IdeaCategory } from '@resource-ai/shared';
import { BookOpen, Palette, Puzzle, Wrench, Package } from 'lucide-react';

export interface IdeaCardProps {
  idea: ProjectIdea;
  onClick: (idea: ProjectIdea) => void;
  index?: number;
}

// Category config uses semantic badge tokens for WCAG AA compliance in both themes.
const CATEGORY_CONFIG: Record<
  IdeaCategory,
  {
    label: string;
    icon: React.ReactNode;
    fgVar: string;
    bgVar: string;
    borderVar: string;
  }
> = {
  beginner: {
    label: 'Beginner',
    icon: <BookOpen className="w-4 h-4" />,
    fgVar: 'var(--badge-success-fg)',
    bgVar: 'var(--badge-success-bg)',
    borderVar: 'var(--badge-success-border)',
  },
  'stem-learning': {
    label: 'STEM Learning',
    icon: <Puzzle className="w-4 h-4" />,
    fgVar: 'var(--badge-info-fg)',
    bgVar: 'var(--badge-info-bg)',
    borderVar: 'var(--badge-info-border)',
  },
  'practical-creative': {
    label: 'Practical & Creative',
    icon: <Palette className="w-4 h-4" />,
    fgVar: 'var(--badge-warning-fg)',
    bgVar: 'var(--badge-warning-bg)',
    borderVar: 'var(--badge-warning-border)',
  },
};

const SKILL_LEVEL_LABELS: Record<ProjectIdea['skillLevel'], string> = {
  Beginner: 'Beginner',
  Intermediate: 'Intermediate',
  Advanced: 'Advanced',
  Professional: 'Professional',
};

export function IdeaCard({ idea, onClick, index = 0 }: IdeaCardProps) {
  const config = CATEGORY_CONFIG[idea.category] ?? CATEGORY_CONFIG.beginner;

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      onClick={() => onClick(idea)}
      className="w-full text-left rounded-xl overflow-hidden cursor-pointer focus:outline-none transition-all"
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border-subtle)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--color-border-default)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          'var(--color-surface-card)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--color-border-subtle)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          'var(--color-surface-elevated)';
      }}
      aria-label={`View implementation guide for: ${idea.title}`}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4
            className="text-sm font-semibold leading-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {idea.title}
          </h4>
          <span
            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              color: config.fgVar,
              backgroundColor: config.bgVar,
              border: `1px solid ${config.borderVar}`,
            }}
          >
            {config.icon}
            {config.label}
          </span>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {idea.description}
        </p>
        <p className="mt-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Skill level:{' '}
          <span
            className="font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {SKILL_LEVEL_LABELS[idea.skillLevel] ?? idea.skillLevel ?? 'Beginner'}
          </span>
        </p>
      </div>

      {/* Materials Section */}
      <div className="px-4 pb-4 space-y-3">
        {/* Required Components */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wrench className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              From Device
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {idea.requiredComponents.map((comp, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--badge-info-bg)',
                  color: 'var(--badge-info-fg)',
                  border: '1px solid var(--badge-info-border)',
                }}
              >
                {comp}
              </span>
            ))}
          </div>
        </div>

        {/* Additional Materials */}
        {idea.additionalMaterials.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Package className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Additional Materials
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {idea.additionalMaterials.map((mat, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px]"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  {mat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
}

export default IdeaCard;
