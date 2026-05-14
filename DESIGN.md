# ReSource AI — Design System

## Theme

Light primary. The scene: a person at home in daylight, broken device on the desk, feeling curious not anxious. Light backgrounds with warm undertones. Dark mode as a secondary option later.

## Color (OKLCH)

Strategy: **Committed** — a warm sage green carries the identity.

### Primary — Sage (warm green, not teal)
- `--color-primary-50`: oklch(0.97 0.01 155)
- `--color-primary-100`: oklch(0.93 0.03 155)
- `--color-primary-200`: oklch(0.86 0.06 155)
- `--color-primary-300`: oklch(0.76 0.09 155)
- `--color-primary-400`: oklch(0.65 0.12 155)
- `--color-primary-500`: oklch(0.55 0.12 155) — main brand
- `--color-primary-600`: oklch(0.47 0.11 155)
- `--color-primary-700`: oklch(0.40 0.09 155)
- `--color-primary-800`: oklch(0.33 0.07 155)
- `--color-primary-900`: oklch(0.26 0.05 155)

### Accent — Terracotta (warm earth)
- `--color-accent-400`: oklch(0.68 0.14 45)
- `--color-accent-500`: oklch(0.60 0.15 45)
- `--color-accent-600`: oklch(0.52 0.14 45)

### Neutrals — Warm stone (tinted toward hue 80)
- `--color-stone-50`: oklch(0.98 0.005 80)
- `--color-stone-100`: oklch(0.96 0.008 80)
- `--color-stone-200`: oklch(0.92 0.01 80)
- `--color-stone-300`: oklch(0.85 0.01 80)
- `--color-stone-400`: oklch(0.70 0.01 80)
- `--color-stone-500`: oklch(0.55 0.01 80)
- `--color-stone-600`: oklch(0.45 0.01 80)
- `--color-stone-700`: oklch(0.35 0.008 80)
- `--color-stone-800`: oklch(0.25 0.006 80)
- `--color-stone-900`: oklch(0.18 0.005 80)

### Semantic
- `--color-success`: oklch(0.60 0.15 145)
- `--color-warning`: oklch(0.75 0.15 75)
- `--color-danger`: oklch(0.60 0.18 25)
- `--color-info`: oklch(0.60 0.10 240)

### Surfaces
- `--surface-page`: var(--color-stone-50)
- `--surface-card`: white with 0.005 chroma tint
- `--surface-elevated`: var(--color-stone-100)

## Typography

### Font Stack
- Headings: "Instrument Sans", system-ui, sans-serif (geometric, warm)
- Body: "Inter", system-ui, sans-serif (readable, neutral)
- Mono: "JetBrains Mono", monospace (for data/code)

### Scale (1.25 ratio)
- xs: 0.75rem / 1rem
- sm: 0.875rem / 1.25rem
- base: 1rem / 1.5rem
- lg: 1.125rem / 1.75rem
- xl: 1.25rem / 1.75rem
- 2xl: 1.5rem / 2rem
- 3xl: 1.875rem / 2.25rem
- 4xl: 2.25rem / 2.5rem

### Weight Hierarchy
- Headings: 600 (semibold)
- Subheadings: 500 (medium)
- Body: 400 (regular)
- Labels: 500 (medium)

## Spacing

8px base unit. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

## Radius

- sm: 6px (inputs, small buttons)
- md: 10px (cards, containers)
- lg: 14px (modals, large surfaces)
- full: 9999px (pills, avatars)

## Elevation

No heavy box-shadows. Use subtle borders + background color shifts.
- Level 0: flat, border only
- Level 1: `0 1px 3px oklch(0 0 0 / 0.04)` — cards
- Level 2: `0 4px 12px oklch(0 0 0 / 0.06)` — dropdowns, popovers
- Level 3: `0 8px 24px oklch(0 0 0 / 0.08)` — modals

## Motion

- Micro: 150ms ease-out (hover, focus)
- Standard: 250ms cubic-bezier(0.16, 1, 0.3, 1) (page transitions, reveals)
- Complex: 400ms cubic-bezier(0.16, 1, 0.3, 1) (layout shifts, multi-element)
- No bounce. No elastic. No decorative animation.

## Components

### Buttons
- Primary: solid sage-500 bg, white text, sage-600 hover
- Secondary: stone-100 bg, stone-700 text, stone-200 hover
- Ghost: transparent bg, stone-600 text, stone-100 hover
- Danger: danger bg, white text

### Inputs
- White bg, stone-300 border, stone-900 text
- Focus: primary-500 border, primary-100 ring (2px)
- Error: danger border, danger-50 bg tint

### Cards
- White bg, stone-200 border, level-1 shadow
- No glassmorphism. No backdrop-blur.
- Hover: border-stone-300, level-2 shadow

## Anti-Patterns (Banned)

- Glassmorphism / backdrop-blur cards
- Animated gradient backgrounds
- Floating particles
- Glow effects (box-shadow with color)
- Gradient text (background-clip: text)
- Side-stripe borders on cards
- Emojis as structural icons
- Purple-to-blue gradients
- Nested cards
