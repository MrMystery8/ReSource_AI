import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { EXPERTISE_LEVEL_ORDER, IDEA_SKILL_TO_EXPERTISE } from '@resource-ai/shared';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
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
      <Card surface="analysis" elevation="md" className="p-6 md:p-7">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="mb-5 overflow-hidden rounded-2xl border px-4 py-4 sm:px-5"
          style={{
            borderColor: 'rgba(52, 211, 153, 0.24)',
            background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(7, 23, 18, 0.96) 58%, rgba(4, 12, 10, 0.98) 100%)',
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <Lightbulb className="h-5 w-5" style={{ color: '#ffffff' }} />
              </div>
              <div className="min-w-0 space-y-1">
                <span className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.28)', backgroundColor: 'rgba(52, 211, 153, 0.08)' }}>
                  Ideas
                </span>
                <h3 className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: '#ffffff' }}>
                  Second Life Ideas
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
                  Choose one idea below to open its guide and keep moving.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onReload}
              disabled={isReloading}
              aria-label="Reload Second Life Ideas"
              className="inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 md:self-center"
              style={{
                backgroundColor: 'rgba(7, 23, 18, 0.96)',
                color: 'rgba(255,255,255,0.82)',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              {isReloading ? 'Loading...' : 'Reload'}
            </button>
          </div>
        </motion.div>

        <div className="mb-6 h-px w-full" style={{ backgroundColor: 'rgba(52, 211, 153, 0.18)' }} />

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
          <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'rgba(52, 211, 153, 0.18)', backgroundColor: 'rgba(7, 23, 18, 0.9)' }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
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
