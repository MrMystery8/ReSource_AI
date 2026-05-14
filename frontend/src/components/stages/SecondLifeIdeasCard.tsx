import { motion } from 'framer-motion';
import type { SecondLifeIdeasOutput, ProjectIdea, IdeaCategory } from '@resource-ai/shared';
import { Lightbulb, Wrench, BookOpen, Palette, Package, Puzzle } from 'lucide-react';

interface Props {
  data: SecondLifeIdeasOutput;
}

const CATEGORY_CONFIG: Record<IdeaCategory, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
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

function IdeaCard({ idea, index }: { idea: ProjectIdea; index: number }) {
  const config = CATEGORY_CONFIG[idea.category] ?? CATEGORY_CONFIG.beginner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      className="rounded-xl bg-stone-100 border border-border-subtle hover:border-primary-500/30 transition-all overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-semibold text-text-primary leading-tight">{idea.title}</h4>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color} ${config.border} border`}>
            {config.icon}
            {config.label}
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{idea.description}</p>
      </div>

      {/* Materials Section */}
      <div className="px-4 pb-4 space-y-3">
        {/* Required Components */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wrench className="w-3 h-3 text-primary-400" />
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">From Device</span>
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
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Additional Materials</span>
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
    </motion.div>
  );
}

export function SecondLifeIdeasCard({ data }: Props) {
  return (
    <div className="card card-hover overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-success-50 border border-emerald-500/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-success-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Safe Second Life Ideas</h3>
          <span className="text-xs text-text-muted">{data.ideas.length} project ideas from your device</span>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {data.ideas.map((idea, i) => (
          <IdeaCard key={i} idea={idea} index={i} />
        ))}
      </div>
    </div>
  );
}
