import { motion } from 'framer-motion';
import type { ProjectIdea, IdeaCategory } from '@resource-ai/shared';
import { BookOpen, Palette, Puzzle, Wrench, Package } from 'lucide-react';

export interface IdeaCardProps {
  idea: ProjectIdea;
  onClick: (idea: ProjectIdea) => void;
  index?: number;
}

const CATEGORY_CONFIG: Record<
  IdeaCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  beginner: {
    label: 'Beginner',
    icon: <BookOpen className="w-4 h-4" />,
    color: 'text-success-500',
    bg: 'bg-success-50',
    border: 'border-emerald-500/20',
  },
  'stem-learning': {
    label: 'STEM Learning',
    icon: <Puzzle className="w-4 h-4" />,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/20',
  },
  'practical-creative': {
    label: 'Practical & Creative',
    icon: <Palette className="w-4 h-4" />,
    color: 'text-warning-500',
    bg: 'bg-warning-50',
    border: 'border-amber-500/20',
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
      className="w-full text-left rounded-xl bg-stone-100 border border-border-subtle hover:border-primary-500/30 hover:bg-stone-100 transition-all overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/50"
      aria-label={`View implementation guide for: ${idea.title}`}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-semibold text-text-primary leading-tight">{idea.title}</h4>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color} ${config.border} border`}
          >
            {config.icon}
            {config.label}
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{idea.description}</p>
        <p className="mt-1.5 text-[10px] text-text-muted">
          Skill level: <span className="font-medium text-text-secondary">{SKILL_LEVEL_LABELS[idea.skillLevel]}</span>
        </p>
      </div>

      {/* Materials Section */}
      <div className="px-4 pb-4 space-y-3">
        {/* Required Components */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wrench className="w-3 h-3 text-primary-400" />
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
              From Device
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {idea.requiredComponents.map((comp, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-primary-500/10 border border-primary-500/20 text-[11px] text-primary-300 font-medium"
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
              <Package className="w-3 h-3 text-text-muted" />
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                Additional Materials
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {idea.additionalMaterials.map((mat, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-[11px] text-text-muted"
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
