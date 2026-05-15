import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Package, Wrench } from 'lucide-react';
import type { ProjectIdea } from '@resource-ai/shared';
import { cn } from '@/lib/utils';

export interface ProjectIdeaCarouselItem {
  idea: ProjectIdea;
  matched: boolean;
}

export interface ProjectIdeaCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ProjectIdeaCarouselItem[];
  onIdeaClick: (idea: ProjectIdea) => void;
}

function ProjectIdeaCard({
  item,
  onIdeaClick,
}: {
  item: ProjectIdeaCarouselItem;
  onIdeaClick: (idea: ProjectIdea) => void;
}) {
  const { idea, matched } = item;

  return (
    <motion.button
      type="button"
      onClick={() => onIdeaClick(idea)}
      className={cn(
        'group relative flex-shrink-0 w-[min(84vw,340px)] snap-start rounded-[24px] border text-left shadow-[var(--shadow-md)]',
        'bg-[var(--color-surface-card)] p-5 sm:w-[340px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
      )}
      whileHover={{ y: -6, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      aria-label={`Open implementation guide for ${idea.title}`}
      style={{
        borderColor: matched
          ? 'color-mix(in srgb, var(--color-primary) 40%, var(--color-border-default))'
          : 'var(--color-border-default)',
        boxShadow: matched
          ? '0 0 0 1px color-mix(in srgb, var(--color-primary) 28%, transparent), 0 0 0 5px color-mix(in srgb, var(--color-primary) 8%, transparent), var(--shadow-md)'
          : 'var(--shadow-md)',
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-[24px]"
        style={{
          background: matched
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 80%, white), var(--color-primary))'
            : 'linear-gradient(180deg, color-mix(in srgb, var(--color-border-default) 70%, transparent), color-mix(in srgb, var(--color-border-subtle) 70%, transparent))',
          opacity: matched ? 1 : 0.35,
        }}
      />

      <div className="pl-2">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div
              className="h-10 w-10 rounded-2xl border"
              style={{
                background: matched
                  ? 'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 16%, white), color-mix(in srgb, var(--color-primary) 8%, transparent))'
                  : 'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-surface-elevated) 90%, white), var(--color-surface-elevated))',
                borderColor: matched
                  ? 'color-mix(in srgb, var(--color-primary) 28%, var(--color-border-default))'
                  : 'var(--color-border-subtle)',
              }}
            />
            <h3 className="text-[1.05rem] font-bold leading-tight text-[var(--color-text-primary)] sm:text-xl">
              {idea.title}
            </h3>
          </div>
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-300 group-hover:rotate-[-12deg]"
            style={{
              borderColor: matched
                ? 'color-mix(in srgb, var(--color-primary) 22%, var(--color-border-default))'
                : 'var(--color-border-default)',
              backgroundColor: matched
                ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-card))'
                : 'var(--color-surface-elevated)',
              color: matched ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {idea.description}
        </p>

        <div className="mt-4 space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
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

    const scrollAmount = current.clientWidth * 0.88;
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
            {items.map((item, index) => (
              <ProjectIdeaCard
                key={`${item.idea.title}-${item.idea.skillLevel}-${index}`}
                item={item}
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
