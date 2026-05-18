import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const CHECKPOINTS = [0, 2, 4 + 9 / 30, 8 + 5 / 30] as const;
const LAST_CHECKPOINT_INDEX = CHECKPOINTS.length - 1;
const TRANSITION_MS = 2000;
const CAPTION_FADE_MS = 160;

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

export function LandingPage(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const wheelIntentRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>('paused');
  const checkpointRef = useRef<CheckpointIndex>(0);
  const readyRef = useRef(false);
  const captionTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>('paused');
  const [checkpoint, setCheckpoint] = useState<CheckpointIndex>(0);
  const [captionCheckpoint, setCaptionCheckpoint] = useState<CheckpointIndex>(0);
  const [captionVisible, setCaptionVisible] = useState(true);

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
      if (captionTimerRef.current !== null) {
        window.clearTimeout(captionTimerRef.current);
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
    setCaptionVisible(false);
    modeRef.current = 'transition';
    if (captionTimerRef.current !== null) {
      window.clearTimeout(captionTimerRef.current);
    }
    captionTimerRef.current = window.setTimeout(() => {
      setCaptionCheckpoint(next);
      setCaptionVisible(true);
      captionTimerRef.current = null;
    }, Math.max(0, TRANSITION_MS - CAPTION_FADE_MS));

    const animate = (now: number) => {
      const raw = clamp((now - startedAt) / TRANSITION_MS, 0, 1);
      const eased = easeInOutCubic(raw);
      setVideoTime(startTime + (endTime - startTime) * eased);

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      setVideoTime(endTime);
      setCheckpoint(next);
      setCaptionCheckpoint(next);
      setCaptionVisible(true);
      setMode('paused');
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

  const currentCaption = CAPTIONS[captionCheckpoint];
  const showFinalActions = mode === 'paused' && checkpoint === LAST_CHECKPOINT_INDEX;

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
          src="/landing/video/laptop-to-project.mp4"
          poster="/landing/stills/scene-1.jpg"
          preload="auto"
          muted
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
        />
        <div className="chapter-shade" />

        <article className={captionVisible ? 'chapter-caption is-visible' : 'chapter-caption is-hidden'}>
          <p className="chapter-kicker">{currentCaption.kicker}</p>
          <h1>{currentCaption.title}</h1>
          <p>{currentCaption.body}</p>
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
