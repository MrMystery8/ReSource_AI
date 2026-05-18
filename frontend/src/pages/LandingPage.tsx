import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './LandingPage.css';

const KEYFRAMES = [0, 108, 191] as const;
const TRANSITION_MS = 1500;

type CheckpointIndex = 0 | 1 | 2;
type Mode = 'paused' | 'transition';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeInOutCubic(t: number): number {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function frameSource(frame: number): string {
  const safeFrame = clamp(Math.round(frame), KEYFRAMES[0], KEYFRAMES[2]);
  return `/landing/frames/frame-${String(safeFrame).padStart(3, '0')}.jpg`;
}

function captionState(
  captionIndex: CheckpointIndex,
  mode: Mode,
  checkpoint: CheckpointIndex,
  transitionFrom: CheckpointIndex,
  transitionTo: CheckpointIndex,
  progress: number
): { opacity: number; y: number } {
  if (mode === 'paused') {
    return captionIndex === checkpoint ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 };
  }

  if (captionIndex === transitionFrom) {
    const t = clamp(progress / 0.35, 0, 1);
    return { opacity: 1 - t, y: -18 * t };
  }

  if (captionIndex === transitionTo) {
    const t = clamp((progress - 0.62) / 0.38, 0, 1);
    return { opacity: t, y: 18 * (1 - t) };
  }

  return { opacity: 0, y: 24 };
}

export function LandingPage(): JSX.Element {
  const [frame, setFrame] = useState<number>(KEYFRAMES[0]);
  const [mode, setMode] = useState<Mode>('paused');
  const [checkpoint, setCheckpoint] = useState<CheckpointIndex>(0);
  const [transitionFrom, setTransitionFrom] = useState<CheckpointIndex>(0);
  const [transitionTo, setTransitionTo] = useState<CheckpointIndex>(0);
  const [transitionProgress, setTransitionProgress] = useState(0);

  const modeRef = useRef<Mode>('paused');
  const checkpointRef = useRef<CheckpointIndex>(0);
  const wheelIntentRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    checkpointRef.current = checkpoint;
  }, [mode, checkpoint]);

  useEffect(() => {
    const preloadFrames = [0, 1, 2, 24, 48, 72, 96, 108, 132, 156, 180, 191];
    preloadFrames.forEach((index) => {
      const img = new Image();
      img.src = frameSource(index);
    });
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const transitionToCheckpoint = (next: CheckpointIndex) => {
    if (modeRef.current === 'transition') {
      return;
    }

    const currentCheckpoint = checkpointRef.current;
    if (next === currentCheckpoint) {
      return;
    }

    const startFrame = KEYFRAMES[currentCheckpoint];
    const endFrame = KEYFRAMES[next];
    const startedAt = performance.now();

    setMode('transition');
    setTransitionFrom(currentCheckpoint);
    setTransitionTo(next);
    setTransitionProgress(0);
    modeRef.current = 'transition';

    const animate = (now: number) => {
      const raw = clamp((now - startedAt) / TRANSITION_MS, 0, 1);
      const eased = easeInOutCubic(raw);
      const interpolated = Math.round(startFrame + (endFrame - startFrame) * eased);

      setFrame(interpolated);
      setTransitionProgress(raw);

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      setFrame(endFrame);
      setCheckpoint(next);
      setMode('paused');
      setTransitionProgress(0);
      modeRef.current = 'paused';
      checkpointRef.current = next;
      rafRef.current = null;
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const triggerByDirection = (direction: 1 | -1) => {
    if (modeRef.current === 'transition') {
      return;
    }

    const current = checkpointRef.current;
    if (direction === 1 && current < 2) {
      transitionToCheckpoint((current + 1) as CheckpointIndex);
      return;
    }
    if (direction === -1 && current > 0) {
      transitionToCheckpoint((current - 1) as CheckpointIndex);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (modeRef.current === 'transition') {
      return;
    }
    wheelIntentRef.current += event.deltaY;
    if (Math.abs(wheelIntentRef.current) < 42) {
      return;
    }
    const direction = wheelIntentRef.current > 0 ? 1 : -1;
    wheelIntentRef.current = 0;
    triggerByDirection(direction);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (modeRef.current === 'transition') {
      return;
    }
    const startY = touchStartYRef.current;
    if (startY === null) {
      return;
    }
    const currentY = event.touches[0]?.clientY ?? startY;
    const delta = startY - currentY;
    if (Math.abs(delta) < 34) {
      return;
    }
    touchStartYRef.current = currentY;
    const direction: 1 | -1 = delta > 0 ? 1 : -1;
    triggerByDirection(direction);
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      triggerByDirection(1);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      triggerByDirection(-1);
    }
  };

  const captionOne = captionState(0, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);
  const captionTwo = captionState(1, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);
  const captionThree = captionState(2, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);

  return (
    <div
      className="chapter-story-root"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Interactive transformation story"
    >
      <div className="chapter-media-shell">
        <img
          className="chapter-frame"
          src={frameSource(frame)}
          alt="Broken laptop transforming into a cardboard fan."
          loading="eager"
          decoding="async"
        />
        <div className="chapter-shade" />

        <motion.article className="chapter-caption" animate={captionOne} transition={{ duration: 0.2 }}>
          <p className="chapter-kicker">Checkpoint 01</p>
          <h1>Broken, but not finished</h1>
          <p>One small scroll starts the first transformation run.</p>
        </motion.article>

        <motion.article className="chapter-caption" animate={captionTwo} transition={{ duration: 0.2 }}>
          <p className="chapter-kicker">Checkpoint 02</p>
          <h1>Core assembly achieved</h1>
          <p>The midpoint now pauses on frame 108 before the final stage.</p>
        </motion.article>

        <motion.article className="chapter-caption" animate={captionThree} transition={{ duration: 0.2 }}>
          <p className="chapter-kicker">Checkpoint 03</p>
          <h1>Second life complete</h1>
          <p>Final state reached. Scroll up to autoplay back to earlier checkpoints.</p>
        </motion.article>
      </div>
    </div>
  );
}
