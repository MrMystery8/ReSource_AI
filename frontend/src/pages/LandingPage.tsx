import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const CHECKPOINTS = [0, 2, 4 + 9 / 30, 8 + 5 / 30] as const;
const LAST_CHECKPOINT_INDEX = CHECKPOINTS.length - 1;
const TRANSITION_MS = 2000;
const LANDING_VIDEO_URL =
  import.meta.env.VITE_LANDING_VIDEO_URL ??
  '/landing/video/laptop-to-project.mp4';

type CheckpointIndex = 0 | 1 | 2 | 3;
type Mode = 'paused' | 'transition';

const CAPTIONS = [
  {
    kicker: 'Checkpoint 01',
    title: 'A broken laptop is still full of value.',
    body: 'We start at failure state, then isolate what can still be reused safely instead of treating the whole device as waste.',
  },
  {
    kicker: 'Checkpoint 02',
    title: 'Inside the shell, the usable core appears.',
    body: 'Recovered cells and boards become the power base for a practical build, with safety and feasibility checked first.',
  },
  {
    kicker: 'Checkpoint 03',
    title: 'From parts to prototype in one pass.',
    body: 'The concept becomes a real assembly: structure, wiring, and function come together into a working form.',
  },
  {
    kicker: 'Checkpoint 04',
    title: 'Second life complete: a working desk fan.',
    body: 'This is the outcome ReSource AI helps you reach, then document and reproduce on your own discarded hardware.',
  },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeInOutCubic(t: number): number {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const wheelIntentRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>('paused');
  const checkpointRef = useRef<CheckpointIndex>(0);
  const readyRef = useRef(false);

  const [mode, setMode] = useState<Mode>('paused');
  const [checkpoint, setCheckpoint] = useState<CheckpointIndex>(0);
  const [transitionFrom, setTransitionFrom] = useState<CheckpointIndex>(0);
  const [transitionTo, setTransitionTo] = useState<CheckpointIndex>(0);
  const [transitionProgress, setTransitionProgress] = useState(0);

  useEffect(() => {
    modeRef.current = mode;
    checkpointRef.current = checkpoint;
  }, [mode, checkpoint]);

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

  const setVideoTime = (time: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const safeTime = clamp(time, CHECKPOINTS[0], CHECKPOINTS[LAST_CHECKPOINT_INDEX]);
    if (Math.abs(video.currentTime - safeTime) > 0.016) {
      video.currentTime = safeTime;
    }
  };

  const transitionToCheckpoint = (next: CheckpointIndex) => {
    if (modeRef.current === 'transition' || !readyRef.current) {
      return;
    }

    const current = checkpointRef.current;
    if (current === next) {
      return;
    }

    const startTime = CHECKPOINTS[current];
    const endTime = CHECKPOINTS[next];
    const startedAt = performance.now();

    setMode('transition');
    setTransitionFrom(current);
    setTransitionTo(next);
    setTransitionProgress(0);
    modeRef.current = 'transition';

    const animate = (now: number) => {
      const raw = clamp((now - startedAt) / TRANSITION_MS, 0, 1);
      const eased = easeInOutCubic(raw);
      setVideoTime(startTime + (endTime - startTime) * eased);
      setTransitionProgress(raw);

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      setVideoTime(endTime);
      setCheckpoint(next);
      setMode('paused');
      setTransitionProgress(0);
      checkpointRef.current = next;
      modeRef.current = 'paused';
      rafRef.current = null;
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const triggerByDirection = (direction: 1 | -1) => {
    if (modeRef.current === 'transition' || !readyRef.current) {
      return;
    }
    const current = checkpointRef.current;
    if (direction === 1 && current < LAST_CHECKPOINT_INDEX) {
      transitionToCheckpoint((current + 1) as CheckpointIndex);
      return;
    }
    if (direction === -1 && current > 0) {
      transitionToCheckpoint((current - 1) as CheckpointIndex);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (modeRef.current === 'transition') {
      return;
    }
    wheelIntentRef.current += event.deltaY;
    if (Math.abs(wheelIntentRef.current) < 42) {
      return;
    }
    const direction: 1 | -1 = wheelIntentRef.current > 0 ? 1 : -1;
    wheelIntentRef.current = 0;
    triggerByDirection(direction);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
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
    triggerByDirection(delta > 0 ? 1 : -1);
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

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    readyRef.current = true;
    video.pause();
    setVideoTime(CHECKPOINTS[0]);
  };

  const currentCaption = CAPTIONS[checkpoint];
  const showFinalActions = mode === 'paused' && checkpoint === LAST_CHECKPOINT_INDEX;
  const captionZero = captionState(0, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);
  const captionOne = captionState(1, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);
  const captionTwo = captionState(2, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);
  const captionThree = captionState(3, mode, checkpoint, transitionFrom, transitionTo, transitionProgress);

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
        <video
          ref={videoRef}
          className="chapter-video"
          src={LANDING_VIDEO_URL}
          poster="/landing/stills/scene-1.jpg"
          preload="auto"
          muted
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
        />
        <div className="chapter-shade" />

        <article className="chapter-caption" style={{ opacity: captionZero.opacity, transform: `translateY(${captionZero.y}px)` }}>
          <p className="chapter-kicker">{CAPTIONS[0].kicker}</p>
          <h1>{CAPTIONS[0].title}</h1>
          <p>{CAPTIONS[0].body}</p>
        </article>

        <article className="chapter-caption" style={{ opacity: captionOne.opacity, transform: `translateY(${captionOne.y}px)` }}>
          <p className="chapter-kicker">{CAPTIONS[1].kicker}</p>
          <h1>{CAPTIONS[1].title}</h1>
          <p>{CAPTIONS[1].body}</p>
        </article>

        <article className="chapter-caption" style={{ opacity: captionTwo.opacity, transform: `translateY(${captionTwo.y}px)` }}>
          <p className="chapter-kicker">{CAPTIONS[2].kicker}</p>
          <h1>{CAPTIONS[2].title}</h1>
          <p>{CAPTIONS[2].body}</p>
        </article>

        <article className="chapter-caption" style={{ opacity: captionThree.opacity, transform: `translateY(${captionThree.y}px)` }}>
          <p className="chapter-kicker">{CAPTIONS[3].kicker}</p>
          <h1>{CAPTIONS[3].title}</h1>
          <p>{CAPTIONS[3].body}</p>
          <div className={showFinalActions ? 'chapter-actions is-visible' : 'chapter-actions is-hidden'}>
            <Link to="/register" className="chapter-btn chapter-btn-primary">
              Get started
            </Link>
            <Link to="/login" className="chapter-btn chapter-btn-secondary">
              I have an account
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
