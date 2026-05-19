import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Recycle, Wrench, Sparkles } from 'lucide-react';

const FEATURE_ITEMS = [
  {
    title: 'AI Device Triage',
    text: 'Analyze damaged components and identify the highest-value salvage route instantly.',
    icon: Cpu,
  },
  {
    title: 'Guided Rebuild Steps',
    text: 'Get practical material lists, safety checks, and build instructions tailored to your device.',
    icon: Wrench,
  },
  {
    title: 'Circular Impact',
    text: 'Convert broken electronics into useful outputs instead of sending parts to landfill.',
    icon: Recycle,
  },
] as const;

function DotField() {
  const dots = useMemo(
    () =>
      Array.from({ length: 120 }).map((_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 19) % 100}%`,
        delay: (i % 9) * 0.22,
        duration: 3.6 + (i % 5) * 0.45,
        size: 1 + (i % 3),
        opacity: 0.07 + (i % 5) * 0.035,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {dots.map((dot) => (
        <motion.span
          key={dot.id}
          className="absolute rounded-full"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            backgroundColor: 'var(--color-primary)',
            opacity: dot.opacity,
          }}
          animate={{ opacity: [dot.opacity, dot.opacity * 2, dot.opacity], scale: [1, 1.25, 1] }}
          transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export function HomePage() {
  return (
    <div
      className="relative min-h-[100dvh] w-screen overflow-hidden"
      style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(140deg, color-mix(in srgb, var(--color-surface-elevated) 90%, #020705) 0%, color-mix(in srgb, var(--color-surface-card) 84%, #04120d) 52%, color-mix(in srgb, var(--color-surface-elevated) 92%, #020907) 100%)',
        }}
      />
      <DotField />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.48))' }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center px-6 py-10 sm:px-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mx-auto w-full max-w-4xl text-center"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs tracking-[0.14em] uppercase"
            style={{
              color: 'var(--color-text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 78%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 26%, transparent)',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            ReSource AI
          </div>

          <h1
            className="mt-5 text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Transform Broken Devices
            <span className="block" style={{ color: 'var(--color-primary)' }}>
              Into Build-Ready Ideas
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
            A conversion-first workspace for e-waste innovation. Scan the device, get AI-ranked recommendations, and build with practical execution paths in minutes.
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl px-7 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.015]"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#04110d',
                boxShadow: '0 14px 30px color-mix(in srgb, var(--color-primary) 30%, transparent)',
              }}
            >
              Build Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-[50px] w-full items-center justify-center rounded-xl px-6 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: 'var(--color-text-primary)',
                backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 76%, transparent)',
                border: '1px solid var(--color-border-default)',
              }}
            >
              Log in
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {FEATURE_ITEMS.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl px-3 py-3"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 62%, transparent)' }}
            >
              <div
                className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
              >
                <feature.icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {feature.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {feature.text}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}