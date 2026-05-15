import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { EXPERTISE_LEVEL_ORDER, IDEA_SKILL_TO_EXPERTISE } from '@resource-ai/shared';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { ProjectIdeaCarousel } from './ui/ProjectIdeaCarousel';

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
    const matched: Array<{ idea: ProjectIdea; matched: boolean }> = [];
    const other: Array<{ idea: ProjectIdea; matched: boolean }> = [];

    for (const idea of ideas) {
      const mappedExpertise = IDEA_SKILL_TO_EXPERTISE[idea.skillLevel];
      const ideaLevel = mappedExpertise ? EXPERTISE_LEVEL_ORDER[mappedExpertise] : Number.POSITIVE_INFINITY;
      const isMatched = Number.isFinite(ideaLevel) && ideaLevel <= userLevel;

      if (isMatched) {
        matched.push({ idea, matched: true });
      } else {
        other.push({ idea, matched: false });
      }
    }

    return [...matched, ...other];
  }, [ideas, userLevel]);

  const matchedCount = orderedItems.filter((item) => item.matched).length;
  const otherCount = orderedItems.length - matchedCount;

  return (
    <motion.section
      {...cardEntrance}
      aria-label="Safe Second Life Ideas"
      className="mt-10 border-t border-[var(--color-border-default)] pt-8"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
            <Lightbulb className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Next step
              </span>
              <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Project picker
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Safe Second Life Ideas
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Click a project card to open its implementation guide. Matched ideas are shown first, with other safe options following behind.
            </p>
          </div>
        </div>

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

      <div className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_74%,var(--color-surface-elevated))] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Select a project
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Choose the idea you want to build next. The selected card opens the step-by-step guide.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-500">
              {matchedCount} matched
            </span>
            {otherCount > 0 && (
              <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-2.5 py-1 font-semibold text-[var(--color-text-muted)]">
                {otherCount} other options
              </span>
            )}
          </div>
        </div>
      </div>

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
        <>
          <ProjectIdeaCarousel
            items={orderedItems}
            onIdeaClick={onIdeaClick}
            className="group"
          />

          {otherCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-4 px-1 text-xs text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_40%,transparent)]" />
                Matched to your level
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)] opacity-60" />
                Other safe options
              </span>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}

export default SecondLifeIdeasSection;
