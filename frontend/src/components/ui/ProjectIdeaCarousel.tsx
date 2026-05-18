import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, Wrench } from 'lucide-react';
import type { ProjectIdea } from '@resource-ai/shared';
import { cn } from '@/lib/utils';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_MUTED_WHITE,
  ANALYSIS_SOFT_SURFACE,
  ANALYSIS_WHITE,
} from '../analysisTheme';

export interface ProjectIdeaCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ProjectIdea[];
  onIdeaClick: (idea: ProjectIdea) => void;
}

const SKILL_LEVEL_STYLES: Record<
  ProjectIdea['skillLevel'],
  {
    chipBackground: string;
    chipBorder: string;
    chipColor: string;
    tint: string;
    background: string;
    accent: string;
  }
> = {
  Beginner: {
    chipBackground: 'rgba(52, 211, 153, 0.96)',
    chipBorder: 'rgba(52, 211, 153, 0.96)',
    chipColor: '#000000',
    tint: 'rgba(52, 211, 153, 0.32)',
    background: 'from-emerald-500/18 via-emerald-500/8 to-transparent',
    accent: ANALYSIS_EMERALD,
  },
  Intermediate: {
    chipBackground: 'rgba(52, 211, 153, 0.10)',
    chipBorder: 'rgba(52, 211, 153, 0.30)',
    chipColor: ANALYSIS_EMERALD,
    tint: 'rgba(52, 211, 153, 0.24)',
    background: 'from-emerald-500/16 via-emerald-500/7 to-transparent',
    accent: ANALYSIS_EMERALD,
  },
  Advanced: {
    chipBackground: 'rgba(255, 255, 255, 0.08)',
    chipBorder: 'rgba(255, 255, 255, 0.18)',
    chipColor: ANALYSIS_WHITE,
    tint: 'rgba(255, 255, 255, 0.14)',
    background: 'from-white/10 via-white/5 to-transparent',
    accent: ANALYSIS_WHITE,
  },
  Professional: {
    chipBackground: 'rgba(255, 255, 255, 0.10)',
    chipBorder: 'rgba(255, 255, 255, 0.22)',
    chipColor: ANALYSIS_WHITE,
    tint: 'rgba(255, 255, 255, 0.18)',
    background: 'from-white/12 via-white/6 to-transparent',
    accent: ANALYSIS_WHITE,
  },
};

function ProjectIdeaCard({
  idea,
  onIdeaClick,
}: {
  idea: ProjectIdea;
  onIdeaClick: (idea: ProjectIdea) => void;
}) {
  const skillStyle = SKILL_LEVEL_STYLES[idea.skillLevel] ?? SKILL_LEVEL_STYLES.Beginner;

  return (
    <motion.button
      type="button"
      onClick={() => onIdeaClick(idea)}
      className={cn(
        'group relative flex-shrink-0 w-[min(84vw,320px)] snap-start overflow-hidden rounded-[26px] border p-0 text-left shadow-[var(--shadow-md)] cursor-pointer appearance-none',
        'bg-black outline-none transition-[box-shadow,border-color,background-color] duration-200 will-change-transform',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-surface)]'
      )}
      whileHover={{ scale: 1.016 }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: 'spring', stiffness: 245, damping: 22, mass: 0.55 }}
      aria-label={`Open implementation guide for ${idea.title}`}
      style={{
        borderColor: 'rgba(52, 211, 153, 0.34)',
        boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.2), 0 0 18px rgba(52, 211, 153, 0.14), 0 18px 42px rgba(0, 0, 0, 0.42)',
      }}
    >
      <div
          className="relative min-h-[400px] overflow-hidden"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${skillStyle.tint} 34%, #000000) 0%, color-mix(in srgb, ${skillStyle.tint} 12%, #000000) 38%, #000000 100%)`,
          }}
        >
        <div
          className="absolute inset-0"
          style={{
            background:
              `radial-gradient(circle at 14% 16%, color-mix(in srgb, ${skillStyle.tint} 26%, transparent), transparent 30%), radial-gradient(circle at 86% 16%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 26%)`,
          }}
        />

        <div className="relative flex h-full flex-col">
          <div className="flex h-[41%] flex-col justify-between px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 pr-2">
                <span
                  className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{
                    borderColor: skillStyle.chipBorder,
                    backgroundColor: skillStyle.chipBackground,
                    color: skillStyle.chipColor,
                  }}
                >
                  {idea.skillLevel}
                </span>
                <h3 className="text-[0.98rem] font-bold leading-tight sm:text-[1.05rem]" style={{ color: ANALYSIS_WHITE }}>
                  {idea.title}
                </h3>
              </div>
            </div>

            <p className="max-w-[30ch] text-sm leading-relaxed" style={{ color: ANALYSIS_EMERALD }}>
              {idea.description}
            </p>
          </div>

          <div
            className="mx-5 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-border-subtle) 70%, transparent), transparent)',
            }}
          />

          <div className="flex flex-1 flex-col justify-between px-5 pb-4 pt-4">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" style={{ color: skillStyle.accent }} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: ANALYSIS_EMERALD }}>
                      From device
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.requiredComponents.slice(0, 3).map((component) => (
                      <span
                        key={component}
                        className="rounded-md border px-2 py-1 text-[11px]"
                        style={{
                          borderColor: 'rgba(52, 211, 153, 0.18)',
                          backgroundColor: ANALYSIS_SOFT_SURFACE,
                          color: ANALYSIS_BODY_WHITE,
                        }}
                      >
                        {component}
                      </span>
                  ))}
                </div>
              </div>

              {idea.additionalMaterials.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" style={{ color: ANALYSIS_WHITE }} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: ANALYSIS_WHITE }}>
                      Additional materials
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.additionalMaterials.slice(0, 3).map((material) => (
                      <span
                        key={material}
                        className="rounded-md border px-2 py-1 text-[11px]"
                        style={{
                          borderColor: 'rgba(255, 255, 255, 0.14)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: ANALYSIS_MUTED_WHITE,
                        }}
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="mt-5 flex items-center justify-between border-t pt-3 text-xs font-medium"
              style={{
                borderColor: 'rgba(52, 211, 153, 0.14)',
                color: ANALYSIS_BODY_WHITE,
              }}
            >
              <span className="transition-colors group-hover:text-white group-focus-visible:text-white">
                Open guide
              </span>
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:scale-110 group-focus-visible:translate-x-1.5 group-focus-visible:scale-110" style={{ color: ANALYSIS_EMERALD }} />
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function ProjectIdeaCarousel({
  items,
  onIdeaClick,
  className,
  ...props
}: ProjectIdeaCarouselProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = React.useCallback((direction: 'left' | 'right') => {
    const current = scrollContainerRef.current;
    if (!current) return;

    const scrollAmount = current.clientWidth * 0.86;
    current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="flex flex-col gap-4">
        <div className="min-w-0 px-1 py-4">
          <div
            className="overflow-visible py-3"
          >
            <div
              ref={scrollContainerRef}
              className="scrollbar-hide flex gap-5 overflow-x-auto px-1 pb-8 snap-x snap-mandatory"
            >
              {items.map((idea, index) => (
                <ProjectIdeaCard
                  key={`${idea.title}-${idea.skillLevel}-${index}`}
                  idea={idea}
                  onIdeaClick={onIdeaClick}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 md:justify-between">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll project ideas left"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-black shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            style={{
              borderColor: 'rgba(52, 211, 153, 0.28)',
              color: ANALYSIS_WHITE,
              boxShadow: '0 0 16px rgba(52, 211, 153, 0.12)',
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll project ideas right"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-black shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            style={{
              borderColor: 'rgba(52, 211, 153, 0.28)',
              color: ANALYSIS_WHITE,
              boxShadow: '0 0 16px rgba(52, 211, 153, 0.12)',
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectIdeaCarousel;
