import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { EXPERTISE_LEVEL_ORDER, IDEA_SKILL_TO_EXPERTISE } from '@resource-ai/shared';
import { AlertCircle, ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import { ProjectIdeaCarousel } from './ui/ProjectIdeaCarousel';
import { Card } from './ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_EMERALD_GLOW,
  ANALYSIS_WHITE,
  ANALYSIS_WHITE_GLOW,
} from './analysisTheme';

export interface SecondLifeIdeasSectionProps {
  ideas: ProjectIdea[];
  userExpertise: ExpertiseLevel;
  onIdeaClick: (idea: ProjectIdea) => void;
  onReload: () => void;
  isReloading: boolean;
  reloadError: string | null;
  showReload?: boolean;
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
  showReload = true,
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
      <Card surface="neon" elevation="md" className="p-6 md:p-7">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="mb-5 overflow-hidden rounded-2xl border px-4 py-4 sm:px-5"
          style={{
            borderColor: 'rgba(52, 211, 153, 0.24)',
            background:
              'linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(7, 23, 18, 0.96) 44%, rgba(0, 0, 0, 1) 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(52, 211, 153, 0.08)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.22)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <Lightbulb className="h-5 w-5" style={{ color: ANALYSIS_WHITE }} />
            </div>
            <div className="min-w-0 space-y-1">
              <span
                className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: ANALYSIS_EMERALD,
                  borderColor: 'rgba(52, 211, 153, 0.28)',
                  backgroundColor: 'rgba(52, 211, 153, 0.08)',
                }}
              >
                Next step
              </span>
              <h3
                className="text-lg font-semibold tracking-tight sm:text-xl"
                style={{ color: ANALYSIS_WHITE, textShadow: ANALYSIS_WHITE_GLOW }}
              >
                Tap a project to continue
              </h3>
              <p
                className="max-w-2xl text-sm leading-relaxed"
                style={{ color: ANALYSIS_EMERALD, textShadow: ANALYSIS_EMERALD_GLOW }}
              >
                Choose one idea below to open its guide and keep moving.
              </p>
            </div>
            <div
              className="ml-auto hidden h-10 w-10 items-center justify-center rounded-full border sm:flex"
              style={{
                borderColor: 'rgba(52, 211, 153, 0.24)',
                backgroundColor: 'rgba(52, 211, 153, 0.08)',
                color: ANALYSIS_EMERALD,
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </motion.div>

        {showReload && (
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={onReload}
              disabled={isReloading}
              aria-label="Reload Second Life Ideas"
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: ANALYSIS_EMERALD,
                color: '#000000',
                borderColor: ANALYSIS_EMERALD,
                boxShadow: '0 0 16px rgba(52, 211, 153, 0.22)',
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              {isReloading ? 'Loading...' : 'Reload'}
            </button>
          </div>
        )}

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
          <div
            className="rounded-2xl border p-6 text-center"
            style={{
              borderColor: 'rgba(52, 211, 153, 0.18)',
              backgroundColor: 'rgba(7, 23, 18, 0.9)',
            }}
          >
            <p className="text-sm" style={{ color: ANALYSIS_BODY_WHITE }}>
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
