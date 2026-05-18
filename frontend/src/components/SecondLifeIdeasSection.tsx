import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { EXPERTISE_LEVEL_ORDER, IDEA_SKILL_TO_EXPERTISE } from '@resource-ai/shared';
import { AlertCircle, ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import { ProjectIdeaCarousel } from './ui/ProjectIdeaCarousel';
import { Card } from './ui/Card';

export interface SecondLifeIdeasSectionProps {
  ideas: ProjectIdea[];
  userExpertise: ExpertiseLevel;
  onIdeaClick: (idea: ProjectIdea) => void;
  onReload: () => void;
  isReloading: boolean;
  reloadError: string | null;
}

const cardEntrance = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
};

export function SecondLifeIdeasSection({
  ideas,
  userExpertise,
  onIdeaClick,
  onReload,
  isReloading,
  reloadError,
}: SecondLifeIdeasSectionProps) {
  const userLevel = EXPERTISE_LEVEL_ORDER[userExpertise] ?? 0;

  const orderedItems = useMemo(() => {
    const matched: ProjectIdea[] = [];
    const other: ProjectIdea[] = [];

    for (const idea of ideas) {
      const mappedExpertise = IDEA_SKILL_TO_EXPERTISE[idea.skillLevel];
      const ideaLevel = mappedExpertise ? EXPERTISE_LEVEL_ORDER[mappedExpertise] : Number.POSITIVE_INFINITY;
      const isMatched = Number.isFinite(ideaLevel) && ideaLevel <= userLevel;

      if (isMatched) {
        matched.push(idea);
      } else {
        other.push(idea);
      }
    }

    return [...matched, ...other];
  }, [ideas, userLevel]);

  return (
    <motion.section
      {...cardEntrance}
      aria-label="Safe Second Life Ideas"
      className="mt-2"
    >
      <Card elevation="md" className="p-6 md:p-7">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="mb-5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border-default))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface-card))_0%,var(--color-surface-card)_65%)] px-4 py-4 sm:px-5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
              <Lightbulb className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0 space-y-1">
              <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border-default))] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Next step
              </span>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-xl">
                Tap a project to continue
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Choose one idea below to open its guide and keep moving.
              </p>
            </div>
            <div className="ml-auto hidden h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border-default))] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)] sm:flex">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </motion.div>

        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={onReload}
            disabled={isReloading}
            aria-label="Reload Second Life Ideas"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border-default)',
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            {isReloading ? 'Loading...' : 'Reload'}
          </button>
        </div>

        <div className="mb-6 h-px w-full bg-[var(--color-border-subtle)]" />

        {reloadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-2 rounded-xl border p-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
            }}
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-error)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-error)' }}>
              {reloadError}
            </p>
          </motion.div>
        )}

        {ideas.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No ideas are available right now. Try reloading or adjust the analysis inputs.
            </p>
          </div>
        ) : (
          <ProjectIdeaCarousel
            items={orderedItems}
            onIdeaClick={onIdeaClick}
          />
        )}
      </Card>
    </motion.section>
  );
}

export default SecondLifeIdeasSection;
