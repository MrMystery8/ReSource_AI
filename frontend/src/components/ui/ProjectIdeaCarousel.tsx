import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, Wrench } from 'lucide-react';
import type { ProjectIdea } from '@resource-ai/shared';
import { cn } from '@/lib/utils';

export interface ProjectIdeaCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ProjectIdea[];
  onIdeaClick: (idea: ProjectIdea) => void;
}

const CARD_HEIGHT_PX = 460;

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
        'group relative w-full overflow-hidden rounded-[26px] border p-0 text-left shadow-[var(--shadow-md)] cursor-pointer appearance-none',
        'outline-none transition-[box-shadow,border-color,background-color] duration-200 will-change-transform',
        'hover:border-[color-mix(in_srgb,var(--color-primary)_32%,var(--color-border-default))]',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-surface)]'
      )}
      whileHover={{ scale: 1.024 }}
      whileTap={{ scale: 0.991 }}
      transition={{ type: 'spring', stiffness: 245, damping: 22, mass: 0.55 }}
      aria-label={`Open implementation guide for ${idea.title}`}
      style={{
        borderColor: 'rgba(52, 211, 153, 0.34)',
        backgroundColor: 'var(--color-surface-card)',
        transformOrigin: 'center center',
        boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.18), 0 16px 36px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        className={cn(
          'relative overflow-hidden',
          'bg-gradient-to-b',
          skillStyle.background
        )}
        style={{
          minHeight: `${CARD_HEIGHT_PX}px`,
          height: `${CARD_HEIGHT_PX}px`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, color-mix(in srgb, var(--color-surface-card) 8%, transparent) 0%, color-mix(in srgb, var(--color-surface-card) 4%, transparent) 42%, transparent 100%), radial-gradient(circle at 14% 16%, color-mix(in srgb, ${skillStyle.tint} 30%, transparent), transparent 28%), radial-gradient(circle at 86% 16%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 24%)`,
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
                <h3
                  className="text-[0.98rem] font-bold leading-tight text-white sm:text-[1.05rem] overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >
                  {idea.title}
                </h3>
              </div>
            </div>

            <p
              className="max-w-[30ch] text-sm leading-relaxed text-white/85 overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}
            >
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
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    From device
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {idea.requiredComponents.slice(0, 3).map((component) => (
                    <span
                      key={component}
                      className="rounded-md border px-2 py-1 text-[11px] text-white/88"
                      style={{ borderColor: 'rgba(52, 211, 153, 0.18)', backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
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
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Additional materials
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.additionalMaterials.slice(0, 3).map((material) => (
                      <span
                        key={material}
                        className="rounded-md border px-2 py-1 text-[11px] text-white/70"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.16)', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-3 text-xs font-medium text-white/85" style={{ borderColor: 'rgba(52, 211, 153, 0.14)' }}>
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
  const scrollTrackRef = React.useRef<HTMLDivElement>(null);
  const isDraggingScrollRef = React.useRef(false);
  const [scrollState, setScrollState] = React.useState({
    canLeft: false,
    canRight: false,
    progress: 0,
    viewRatio: 1,
  });

  const updateScrollState = React.useCallback(() => {
    const current = scrollContainerRef.current;
    if (!current) return;

    const maxScroll = Math.max(current.scrollWidth - current.clientWidth, 0);
    const progress = maxScroll === 0 ? 0 : current.scrollLeft / maxScroll;
    const viewRatio = current.scrollWidth === 0 ? 1 : Math.min(current.clientWidth / current.scrollWidth, 1);

    setScrollState({
      canLeft: current.scrollLeft > 1,
      canRight: current.scrollLeft < maxScroll - 1,
      progress,
      viewRatio,
    });
  }, []);

  const setScrollByProgress = React.useCallback((progress: number) => {
    const current = scrollContainerRef.current;
    if (!current) return;
    const clamped = Math.min(1, Math.max(0, progress));
    const maxScroll = Math.max(current.scrollWidth - current.clientWidth, 0);
    current.scrollLeft = maxScroll * clamped;
  }, []);

  const updateScrollFromClientX = React.useCallback((clientX: number) => {
    const track = scrollTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relativeX = Math.min(rect.width, Math.max(0, clientX - rect.left));
    setScrollByProgress(relativeX / rect.width);
  }, [setScrollByProgress]);

  React.useEffect(() => {
    const current = scrollContainerRef.current;
    if (!current) return;

    updateScrollState();
    const onScroll = () => updateScrollState();
    current.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      current.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingScrollRef.current) return;
      updateScrollFromClientX(event.clientX);
    };

    const handleMouseUp = () => {
      if (!isDraggingScrollRef.current) return;
      isDraggingScrollRef.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [updateScrollFromClientX]);

  const scroll = React.useCallback((direction: 'left' | 'right') => {
    const current = scrollContainerRef.current;
    if (!current) return;

    const scrollAmount = current.clientWidth * 0.86;
    current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const thumbWidthPercent = Math.max(scrollState.viewRatio * 100, 20);
  const thumbLeftPercent = scrollState.progress * (100 - thumbWidthPercent);

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="flex flex-col gap-2">
        <div className="min-w-0 px-1 py-2">
          <div className="overflow-visible py-1">
            <div
              ref={scrollContainerRef}
              className="scrollbar-hide flex gap-5 overflow-x-auto px-1 pb-3 snap-x snap-mandatory"
            >
              {items.map((idea, index) => (
                <div
                  key={`${idea.title}-${idea.skillLevel}-${index}`}
                  className="w-[min(84vw,320px)] flex-shrink-0 snap-start py-2"
                >
                  <ProjectIdeaCard
                    idea={idea}
                    onIdeaClick={onIdeaClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll project ideas left"
            disabled={!scrollState.canLeft}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-black text-white shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            style={{ borderColor: 'rgba(52, 211, 153, 0.28)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={scrollTrackRef}
            className="relative h-1.5 w-28 overflow-hidden rounded-full cursor-pointer"
            aria-label="Project ideas scroll position"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scrollState.progress * 100)}
            tabIndex={0}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
            onMouseDown={(event) => {
              isDraggingScrollRef.current = true;
              document.body.style.userSelect = 'none';
              updateScrollFromClientX(event.clientX);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setScrollByProgress(scrollState.progress - 0.08);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                setScrollByProgress(scrollState.progress + 0.08);
              }
            }}
          >
            <div
              className="absolute top-0 h-full rounded-full transition-[left,width] duration-150 cursor-grab active:cursor-grabbing"
              style={{
                left: `${thumbLeftPercent}%`,
                width: `${thumbWidthPercent}%`,
                background: 'linear-gradient(90deg, rgba(52, 211, 153, 0.95), rgba(110, 231, 183, 0.95))',
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
                isDraggingScrollRef.current = true;
                document.body.style.userSelect = 'none';
                updateScrollFromClientX(event.clientX);
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll project ideas right"
            disabled={!scrollState.canRight}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-black text-white shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            style={{ borderColor: 'rgba(52, 211, 153, 0.28)' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectIdeaCarousel;
