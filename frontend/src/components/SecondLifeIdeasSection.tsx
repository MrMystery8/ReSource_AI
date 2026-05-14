import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { Lightbulb, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { IdeaCard } from './IdeaCard';

export interface SecondLifeIdeasSectionProps {
  ideas: ProjectIdea[];
  userExpertise: ExpertiseLevel;
  onIdeaClick: (idea: ProjectIdea) => void;
  onReload: () => void;
  isReloading: boolean;
  reloadError: string | null;
}

// Number of cards visible at once in the carousel
const VISIBLE_COUNT = 3;

export function SecondLifeIdeasSection({
  ideas,
  userExpertise,
  onIdeaClick,
  onReload,
  isReloading,
  reloadError,
}: SecondLifeIdeasSectionProps) {
  // The AI generates ideas with the first 3 tailored to the user's expertise level.
  // We split at index 3: first 3 are "matched", the rest are "other skill levels".
  const MATCHED_COUNT = 3;
  const matchedIdeas = ideas.slice(0, MATCHED_COUNT);
  const otherIdeas = ideas.slice(MATCHED_COUNT);

  // Carousel order: matched first, then others
  const allIdeas = [...matchedIdeas, ...otherIdeas];

  // Current offset — the index of the leftmost visible card
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset offset when ideas change (e.g. after reload)
  useEffect(() => {
    setOffset(0);
  }, [ideas]);

  const maxOffset = Math.max(0, allIdeas.length - VISIBLE_COUNT);
  const canGoLeft = offset > 0;
  const canGoRight = offset < maxOffset;

  const goLeft = useCallback(() => {
    if (!canGoLeft || isAnimating) return;
    setDirection(-1);
    setOffset((prev) => Math.max(0, prev - 1));
  }, [canGoLeft, isAnimating]);

  const goRight = useCallback(() => {
    if (!canGoRight || isAnimating) return;
    setDirection(1);
    setOffset((prev) => Math.min(maxOffset, prev + 1));
  }, [canGoRight, isAnimating, maxOffset]);

  // Keyboard navigation
  const containerRef = useRef<HTMLDivElement>(null);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goLeft(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goRight(); }
    },
    [goLeft, goRight]
  );

  const visibleIdeas = allIdeas.slice(offset, offset + VISIBLE_COUNT);

  // Dot indicators
  const totalPages = maxOffset + 1;
  const currentPage = offset;

  return (
    <div
      className="overflow-hidden rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-colors"
    >
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Safe Second Life Ideas
            </h3>
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {matchedIdeas.length} for your level
              {otherIdeas.length > 0 && ` · ${otherIdeas.length} at other levels`}
            </span>
          </div>
        </div>

        {/* Reload Button */}
        <button
          onClick={onReload}
          disabled={isReloading}
          aria-label="Reload Second Life Ideas"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!isReloading) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-subtle)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isReloading ? 'Loading...' : 'Reload'}
        </button>
      </div>

      {/* Reload Error */}
      {reloadError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mb-4 p-3 rounded-lg flex items-start gap-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
          }}
          role="alert"
        >
          <AlertCircle
            className="w-4 h-4 shrink-0 mt-0.5"
            style={{ color: 'var(--color-error)' }}
          />
          <p className="text-xs" style={{ color: 'var(--color-error)' }}>
            {reloadError}
          </p>
        </motion.div>
      )}

      {allIdeas.length === 0 ? (
        <div className="px-6 pb-6">
          <p
            className="text-sm text-center py-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No ideas available. Try reloading or adjusting your expertise level.
          </p>
        </div>
      ) : (
        <div className="px-6 pb-6">
          {/* Carousel wrapper */}
          <div
            ref={containerRef}
            className="relative focus:outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label="Safe Second Life Ideas carousel"
            aria-roledescription="carousel"
          >
            {/* Cards row */}
            <div className="relative overflow-hidden">
              <AnimatePresence
                mode="popLayout"
                initial={false}
                onExitComplete={() => setIsAnimating(false)}
              >
                <motion.div
                  key={offset}
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(VISIBLE_COUNT, visibleIdeas.length)}, 1fr)`,
                  }}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onAnimationStart={() => setIsAnimating(true)}
                  onAnimationComplete={() => setIsAnimating(false)}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {visibleIdeas.map((idea, i) => {
                    const globalIndex = offset + i;
                    const isMatched = globalIndex < matchedIdeas.length;
                    return (
                      <div key={`${idea.title}-${globalIndex}`} className="relative">
                        {/* Matched indicator — subtle left border accent */}
                        {isMatched && (
                          <div
                            className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full z-10"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          />
                        )}
                        <div
                          style={{
                            opacity: isMatched ? 1 : 0.65,
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isMatched) (e.currentTarget as HTMLDivElement).style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            if (!isMatched) (e.currentTarget as HTMLDivElement).style.opacity = '0.65';
                          }}
                        >
                          <IdeaCard
                            idea={idea}
                            onClick={onIdeaClick}
                            index={i}
                          />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation row: left arrow · dots · right arrow */}
            {allIdeas.length > VISIBLE_COUNT && (
              <div className="flex items-center justify-between mt-4">
                {/* Left arrow */}
                <button
                  onClick={goLeft}
                  disabled={!canGoLeft || isAnimating}
                  aria-label="Previous ideas"
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: canGoLeft
                      ? 'var(--color-surface-elevated)'
                      : 'transparent',
                    border: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (canGoLeft) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'var(--color-primary)';
                      (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'var(--color-border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'var(--color-text-secondary)';
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dot indicators */}
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Carousel position">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      role="tab"
                      aria-selected={i === currentPage}
                      aria-label={`Go to position ${i + 1}`}
                      onClick={() => {
                        if (isAnimating) return;
                        setDirection(i > offset ? 1 : -1);
                        setOffset(i);
                      }}
                      className="rounded-full transition-all"
                      style={{
                        width: i === currentPage ? '20px' : '6px',
                        height: '6px',
                        backgroundColor:
                          i === currentPage
                            ? 'var(--color-primary)'
                            : 'var(--color-border-default)',
                      }}
                    />
                  ))}
                </div>

                {/* Right arrow */}
                <button
                  onClick={goRight}
                  disabled={!canGoRight || isAnimating}
                  aria-label="Next ideas"
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: canGoRight
                      ? 'var(--color-surface-elevated)'
                      : 'transparent',
                    border: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (canGoRight) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'var(--color-primary)';
                      (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'var(--color-border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'var(--color-text-secondary)';
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Expertise legend — always shown when carousel has more than 3 ideas */}
            {allIdeas.length > VISIBLE_COUNT && (
              <div
                className="mt-4 flex items-center gap-5 text-xs px-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-primary) 40%, transparent), 0 0 6px var(--color-primary)',
                    }}
                  />
                  Matched to your level
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-text-muted)',
                      opacity: 0.6,
                    }}
                  />
                  Other skill levels
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SecondLifeIdeasSection;
