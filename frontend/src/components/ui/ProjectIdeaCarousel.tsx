import * as React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Package,
  Palette,
  Puzzle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { ProjectIdea, IdeaCategory } from '@resource-ai/shared';
import { cn } from '@/lib/utils';

export interface ProjectIdeaCarouselItem {
  idea: ProjectIdea;
  matched: boolean;
}

export interface ProjectIdeaCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ProjectIdeaCarouselItem[];
  onIdeaClick: (idea: ProjectIdea) => void;
}

const CATEGORY_META: Record<
  IdeaCategory,
  {
    label: string;
    icon: React.ReactNode;
    accent: string;
    softAccent: string;
  }
> = {
  beginner: {
    label: 'Beginner friendly',
    icon: <BookOpen className="h-4 w-4" />,
    accent: 'text-emerald-400',
    softAccent: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
  },
  'stem-learning': {
    label: 'STEM learning',
    icon: <Puzzle className="h-4 w-4" />,
    accent: 'text-primary-400',
    softAccent: 'from-primary-500/25 via-primary-500/10 to-transparent',
  },
  'practical-creative': {
    label: 'Practical + creative',
    icon: <Palette className="h-4 w-4" />,
    accent: 'text-amber-400',
    softAccent: 'from-amber-500/25 via-amber-500/10 to-transparent',
  },
};

function buildInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ProjectIdeaCard({
  item,
  onIdeaClick,
}: {
  item: ProjectIdeaCarouselItem;
  onIdeaClick: (idea: ProjectIdea) => void;
}) {
  const { idea, matched } = item;
  const meta = CATEGORY_META[idea.category] ?? CATEGORY_META.beginner;
  const initials = buildInitials(idea.title);

  return (
    <motion.button
      type="button"
      onClick={() => onIdeaClick(idea)}
      className={cn(
        'group relative flex-shrink-0 w-[min(88vw,360px)] h-[430px] snap-start overflow-hidden rounded-[28px] border text-left shadow-[var(--shadow-md)]',
        'bg-[var(--color-surface-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'
      )}
      whileHover={{ y: -8, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      aria-label={`Open implementation guide for ${idea.title}`}
      style={{
        borderColor: matched
          ? 'color-mix(in srgb, var(--color-primary) 38%, var(--color-border-default))'
          : 'var(--color-border-default)',
      }}
    >
      <div
        className="relative h-[44%] overflow-hidden"
        style={{ opacity: matched ? 1 : 0.92 }}
      >
        <div className={cn('absolute inset-0 bg-gradient-to-br', meta.softAccent)} />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 30%), radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--color-accent) 20%, transparent), transparent 24%), linear-gradient(145deg, rgba(255,255,255,0.18), transparent 45%)',
          }}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm',
              meta.accent,
              matched
                ? 'border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                : 'border-[var(--color-border-default)] bg-[color-mix(in_srgb,var(--color-surface-card)_70%,transparent)]'
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm',
              matched
                ? 'border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]'
                : 'border-[var(--color-border-default)] bg-[color-mix(in_srgb,var(--color-surface-card)_72%,transparent)] text-[var(--color-text-muted)]'
            )}
          >
            {matched ? 'Best fit' : 'Other level'}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-4 pt-14">
          <div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-[32px] border shadow-[0_18px_40px_rgba(0,0,0,0.12)]',
              matched
                ? 'border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]'
                : 'border-[var(--color-border-default)] bg-[color-mix(in_srgb,var(--color-surface-card)_86%,transparent)]'
            )}
          >
            <div
              className="absolute inset-3 rounded-[24px]"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.42), transparent 35%), radial-gradient(circle at 65% 68%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 42%), linear-gradient(145deg, rgba(255,255,255,0.22), transparent 65%)',
              }}
            />
            <span className={cn('relative text-4xl font-bold tracking-tight', meta.accent)}>{initials || 'AI'}</span>
          </div>
        </div>
      </div>

      <div className="flex h-[56%] flex-col justify-between p-5">
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-xl font-bold leading-tight text-[var(--color-text-primary)]">
              {idea.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {idea.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                matched
                  ? 'border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {idea.skillLevel}
            </span>
            {matched && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                <Sparkles className="h-3.5 w-3.5" />
                Matched to your level
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-[var(--color-border-subtle)] pt-4">
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
                    className="rounded-md border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_75%,var(--color-surface-elevated))] px-2 py-1 text-[11px] text-[var(--color-text-muted)]"
                  >
                    {material}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            Click to open guide
          </span>
          <span
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-300',
              matched
                ? 'border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[var(--color-primary)] text-[var(--color-surface-card)] group-hover:rotate-[-12deg]'
                : 'border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] group-hover:rotate-[-12deg] group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-text-primary)]'
            )}
          >
            <ArrowRight className="h-4 w-4" />
          </span>
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

    const scrollAmount = current.clientWidth * 0.82;
    current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className={cn('group relative w-full', className)} {...props}>
      <div className="absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-[var(--color-surface)] to-transparent md:block" />
      <div className="absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-[var(--color-surface)] to-transparent md:block" />

      <button
        type="button"
        onClick={() => scroll('left')}
        aria-label="Scroll project ideas left"
        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[var(--color-border-default)] bg-[color-mix(in_srgb,var(--color-surface-card)_78%,transparent)] p-2.5 text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-md transition-opacity hover:bg-[var(--color-surface-card)] md:opacity-0 md:group-hover:opacity-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => scroll('right')}
        aria-label="Scroll project ideas right"
        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[var(--color-border-default)] bg-[color-mix(in_srgb,var(--color-surface-card)_78%,transparent)] p-2.5 text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-md transition-opacity hover:bg-[var(--color-surface-card)] md:opacity-0 md:group-hover:opacity-100"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide flex gap-5 overflow-x-auto pb-4 pr-2 pt-1 snap-x snap-mandatory"
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
  );
}

export default ProjectIdeaCarousel;
