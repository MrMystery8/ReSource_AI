import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, Wrench } from 'lucide-react';
import type { ProjectIdea } from '@resource-ai/shared';
import { cn } from '@/lib/utils';

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
    chipBackground: 'color-mix(in srgb, var(--badge-success-bg) 78%, transparent)',
    chipBorder: 'var(--badge-success-border)',
    chipColor: 'var(--badge-success-fg)',
    tint: 'var(--badge-success-bg)',
    background: 'from-emerald-500/18 via-emerald-500/8 to-transparent',
    accent: 'var(--color-primary)',
  },
  Intermediate: {
    chipBackground: 'color-mix(in srgb, var(--badge-success-bg) 70%, transparent)',
    chipBorder: 'var(--badge-success-border)',
    chipColor: 'var(--badge-success-fg)',
    tint: 'var(--badge-success-bg)',
    background: 'from-emerald-500/16 via-emerald-500/7 to-transparent',
    accent: 'var(--color-primary)',
  },
  Advanced: {
    chipBackground: 'color-mix(in srgb, var(--badge-error-bg) 78%, transparent)',
    chipBorder: 'var(--badge-error-border)',
    chipColor: 'var(--badge-error-fg)',
    tint: 'var(--badge-error-bg)',
    background: 'from-rose-500/20 via-rose-500/9 to-transparent',
    accent: 'var(--color-error)',
  },
  Professional: {
    chipBackground: 'color-mix(in srgb, var(--badge-error-bg) 70%, transparent)',
    chipBorder: 'var(--badge-error-border)',
    chipColor: 'var(--badge-error-fg)',
    tint: 'var(--badge-error-bg)',
    background: 'from-rose-500/22 via-rose-500/10 to-transparent',
    accent: 'var(--color-error)',
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
        'group relative flex-shrink-0 w-[min(84vw,320px)] snap-start overflow-hidden rounded-[26px] border text-left shadow-[var(--shadow-md)] cursor-pointer',
        'bg-[var(--color-surface-card)] outline-none transition-[box-shadow,border-color,background-color] duration-200 will-change-transform',
        'hover:border-[color-mix(in_srgb,var(--color-primary)_32%,var(--color-border-default))]',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-surface)]'
      )}
      whileHover={{ scale: 1.016 }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: 'spring', stiffness: 245, damping: 22, mass: 0.55 }}
      aria-label={`Open implementation guide for ${idea.title}`}
      style={{
        borderColor: 'var(--color-border-default)',
      }}
    >
      <div
          className={cn(
            'relative min-h-[400px] overflow-hidden',
            'bg-gradient-to-b',
            skillStyle.background
          )}
        >
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, color-mix(in srgb, var(--color-surface-card) 4%, transparent) 0%, color-mix(in srgb, var(--color-surface-card) 2%, transparent) 28%, transparent 100%), radial-gradient(circle at 14% 16%, color-mix(in srgb, ${skillStyle.tint} 28%, transparent), transparent 30%), radial-gradient(circle at 86% 16%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 26%)`,
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
                <h3 className="text-[0.98rem] font-bold leading-tight text-[var(--color-text-primary)] sm:text-[1.05rem]">
                  {idea.title}
                </h3>
              </div>
            </div>

            <p className="max-w-[30ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    From device
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {idea.requiredComponents.slice(0, 3).map((component) => (
                    <span
                      key={component}
                      className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)]"
                    >
                      {component}
                    </span>
                  ))}
                </div>
              </div>

              {idea.additionalMaterials.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      Additional materials
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.additionalMaterials.slice(0, 3).map((material) => (
                      <span
                        key={material}
                        className="rounded-md border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_78%,var(--color-surface-elevated))] px-2 py-1 text-[11px] text-[var(--color-text-muted)]"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-xs font-medium text-[var(--color-text-secondary)]">
              <span className="transition-colors group-hover:text-[var(--color-text-primary)] group-focus-visible:text-[var(--color-text-primary)]">
                Open guide
              </span>
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:scale-110 group-hover:text-[var(--color-primary)] group-focus-visible:translate-x-1.5 group-focus-visible:scale-110 group-focus-visible:text-[var(--color-primary)]" />
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll project ideas right"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectIdeaCarousel;
