import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Package, Wrench } from 'lucide-react';
import type { ProjectIdea, IdeaCategory } from '@resource-ai/shared';
import { cn } from '@/lib/utils';

export interface ProjectIdeaCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ProjectIdea[];
  onIdeaClick: (idea: ProjectIdea) => void;
}

const CATEGORY_STYLES: Record<
  IdeaCategory,
  {
    accent: string;
    background: string;
  }
> = {
  beginner: {
    accent: 'text-emerald-400',
    background: 'from-emerald-500/18 via-emerald-500/8 to-transparent',
  },
  'stem-learning': {
    accent: 'text-primary-400',
    background: 'from-primary-500/18 via-primary-500/8 to-transparent',
  },
  'practical-creative': {
    accent: 'text-amber-400',
    background: 'from-amber-500/18 via-amber-500/8 to-transparent',
  },
};

function ProjectIdeaCard({
  idea,
  onIdeaClick,
}: {
  idea: ProjectIdea;
  onIdeaClick: (idea: ProjectIdea) => void;
}) {
  const categoryStyle = CATEGORY_STYLES[idea.category] ?? CATEGORY_STYLES.beginner;

  return (
    <motion.button
      type="button"
      onClick={() => onIdeaClick(idea)}
      className={cn(
        'group relative flex-shrink-0 w-[min(86vw,360px)] snap-start overflow-hidden rounded-[28px] border text-left shadow-[var(--shadow-md)]',
        'bg-[var(--color-surface-card)] p-5 sm:w-[360px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
      )}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      aria-label={`Open implementation guide for ${idea.title}`}
      style={{
        borderColor: 'var(--color-border-default)',
      }}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[42%] overflow-hidden bg-gradient-to-br',
          categoryStyle.background
        )}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 16% 24%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 30%), radial-gradient(circle at 84% 22%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 26%), radial-gradient(circle at 50% 66%, rgba(255,255,255,0.14), transparent 34%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-border-subtle) 70%, transparent), transparent)',
            opacity: 0.8,
          }}
        />
      </div>

      <div className="relative pt-24">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="text-[1.05rem] font-bold leading-tight text-[var(--color-text-primary)] sm:text-xl">
              {idea.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {idea.description}
            </p>
          </div>

          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:rotate-[-10deg]"
            style={{
              borderColor: 'var(--color-border-default)',
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        <div className="space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-[var(--color-primary)]" />
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
        <div className="min-w-0">
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide flex gap-5 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory"
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

        <div className="flex items-center justify-center gap-3 md:justify-between">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll project ideas left"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll project ideas right"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectIdeaCarousel;
