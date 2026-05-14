import { motion } from 'framer-motion';
import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { Lightbulb, RefreshCw, AlertCircle } from 'lucide-react';
import { IdeaCard } from './IdeaCard';
import { filterIdeasByExpertise } from '../utils/filterIdeasByExpertise';

export interface SecondLifeIdeasSectionProps {
  ideas: ProjectIdea[];
  userExpertise: ExpertiseLevel;
  onIdeaClick: (idea: ProjectIdea) => void;
  onReload: () => void;
  isReloading: boolean;
  reloadError: string | null;
}

export function SecondLifeIdeasSection({
  ideas,
  userExpertise,
  onIdeaClick,
  onReload,
  isReloading,
  reloadError,
}: SecondLifeIdeasSectionProps) {
  // Filter ideas to only show those whose skill level ≤ user's expertise level.
  // Defaults to 'Beginner' if userExpertise is somehow undefined (per Requirement 3.8).
  const filteredIdeas = filterIdeasByExpertise(ideas, userExpertise);

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-colors">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Safe Second Life Ideas</h3>
            <span className="text-xs text-text-muted">
              {filteredIdeas.length} project idea{filteredIdeas.length !== 1 ? 's' : ''} matched to your expertise
            </span>
          </div>
        </div>

        {/* Reload Button */}
        <button
          onClick={onReload}
          disabled={isReloading}
          aria-label="Reload Second Life Ideas"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-text-secondary text-xs font-medium hover:border-primary-500/30 hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isReloading ? 'Loading...' : 'Reload'}
        </button>
      </div>

      {/* Reload Error Toast */}
      {reloadError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300">{reloadError}</p>
        </motion.div>
      )}

      {/* Ideas Grid — 1 column on narrow viewports, 3 columns at ≥1024px */}
      {filteredIdeas.length > 0 ? (
        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {filteredIdeas.map((idea, i) => (
            <IdeaCard key={`${idea.title}-${i}`} idea={idea} onClick={onIdeaClick} index={i} />
          ))}
        </div>
      ) : (
        <div className="px-6 pb-6">
          <p className="text-sm text-text-muted text-center py-4">
            No ideas match your current expertise level. Try reloading or adjusting your expertise level.
          </p>
        </div>
      )}
    </div>
  );
}

export default SecondLifeIdeasSection;
