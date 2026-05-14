---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,jsx,html,css,scss,svelte,vue}"
---

# UI/UX Pro Max - Design Intelligence Guidelines

Comprehensive design guide for web and mobile applications. Apply these rules when designing, building, reviewing, or improving any UI component, page, or interaction.

## Rule Categories by Priority

Follow priority 1→10 to decide which rule category to focus on first.

| # | Category | Priority | Focus |
|---|----------|----------|-------|
| 1 | Accessibility | CRITICAL | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels |
| 2 | Touch & Interaction | CRITICAL | Min size 44×44px, 8px+ spacing, Loading feedback |
| 3 | Performance | HIGH | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1) |
| 4 | Style Selection | HIGH | Match product type, Consistency, SVG icons (no emoji) |
| 5 | Layout & Responsive | HIGH | Mobile-first breakpoints, Viewport meta, No horizontal scroll |
| 6 | Typography & Color | MEDIUM | Base 16px, Line-height 1.5, Semantic color tokens |
| 7 | Animation | MEDIUM | Duration 150–300ms, Motion conveys meaning, Spatial continuity |
| 8 | Forms & Feedback | MEDIUM | Visible labels, Error near field, Helper text, Progressive disclosure |
| 9 | Navigation Patterns | HIGH | Predictable back, Bottom nav ≤5, Deep linking |
| 10 | Charts & Data | LOW | Legends, Tooltips, Accessible colors |

## 1. Accessibility (CRITICAL)

- Color contrast minimum 4.5:1 for normal text (large text 3:1)
- Visible focus rings on interactive elements (2–4px)
- Descriptive alt text for meaningful images
- aria-label for icon-only buttons
- Tab order matches visual order; full keyboard support
- Use label with for attribute on form fields
- Skip to main content for keyboard users
- Sequential h1→h6, no level skip
- Don't convey info by color alone (add icon/text)
- Respect prefers-reduced-motion
- Meaningful accessibilityLabel; logical reading order for screen readers
- Provide cancel/back in modals and multi-step flows

## 2. Touch & Interaction (CRITICAL)

- Min 44×44pt (Apple) / 48×48dp (Material) touch targets
- Minimum 8px gap between touch targets
- Use click/tap for primary interactions; don't rely on hover alone
- Disable button during async operations; show spinner or progress
- Clear error messages near problem
- Add cursor-pointer to clickable elements
- Avoid horizontal swipe on main content; prefer vertical scroll
- Use touch-action: manipulation to reduce 300ms delay
- Visual feedback on press (ripple/highlight)
- Don't block system gestures (back swipe, etc.)

## 3. Performance (HIGH)

- Use WebP/AVIF, responsive images (srcset/sizes), lazy load non-critical assets
- Declare width/height or use aspect-ratio to prevent layout shift
- Use font-display: swap/optional to avoid invisible text
- Prioritize above-the-fold CSS
- Lazy load non-hero components via dynamic import / route-level splitting
- Split code by route/feature to reduce initial load
- Load third-party scripts async/defer
- Reserve space for async content to avoid layout jumps
- Use skeleton screens instead of long blocking spinners for >1s operations
- Debounce/throttle high-frequency events (scroll, resize, input)
- Virtualize lists with 50+ items

## 4. Style Selection (HIGH)

- Match style to product type
- Use same style across all pages
- Use SVG icons (Heroicons, Lucide), not emojis
- Choose palette from product/industry
- Shadows, blur, radius aligned with chosen style
- Make hover/pressed/disabled states visually distinct
- Use a consistent elevation/shadow scale
- Design light/dark variants together
- Use one icon set/visual language across the product
- Each screen should have only one primary CTA

## 5. Layout & Responsive (HIGH)

- width=device-width initial-scale=1 (never disable zoom)
- Design mobile-first, then scale up
- Use systematic breakpoints (375 / 768 / 1024 / 1440)
- Minimum 16px body text on mobile
- Mobile 35–60 chars per line; desktop 60–75 chars
- No horizontal scroll on mobile
- Use 4pt/8dp incremental spacing system
- Consistent max-width on desktop (max-w-6xl / 7xl)
- Define layered z-index scale
- Fixed navbar/bottom bar must reserve safe padding
- Prefer min-h-dvh over 100vh on mobile

## 6. Typography & Color (MEDIUM)

- Line-height 1.5-1.75 for body text
- Limit to 65-75 characters per line
- Match heading/body font personalities
- Consistent type scale (12 14 16 18 24 32)
- Darker text on light backgrounds (slate-900 on white)
- Use font-weight to reinforce hierarchy: Bold headings (600–700), Regular body (400)
- Define semantic color tokens (primary, secondary, error, surface)
- Dark mode uses desaturated/lighter tonal variants, not inverted colors
- Foreground/background pairs must meet 4.5:1 (AA) or 7:1 (AAA)
- Use tabular/monospaced figures for data columns, prices, timers

## 7. Animation (MEDIUM)

- 150–300ms for micro-interactions; complex transitions ≤400ms
- Use transform/opacity only; avoid animating width/height/top/left
- Show skeleton or progress indicator when loading exceeds 300ms
- Animate 1-2 key elements per view max
- Use ease-out for entering, ease-in for exiting; avoid linear
- Every animation must express cause-effect, not just decoration
- State changes should animate smoothly, not snap
- Prefer spring/physics-based curves for natural feel
- Exit animations shorter than enter (~60–70% of enter duration)
- Stagger list/grid item entrance by 30–50ms per item
- Animations must be interruptible
- Never block user input during an animation

## 8. Forms & Feedback (MEDIUM)

- Visible label per input (not placeholder-only)
- Show error below the related field
- Loading then success/error state on submit
- Mark required fields (asterisk)
- Helpful message and action when no content (empty states)
- Auto-dismiss toasts in 3-5s
- Confirm before destructive actions
- Validate on blur (not keystroke)
- Use semantic input types (email, tel, number) for correct mobile keyboard
- Provide show/hide toggle for password fields
- Allow undo for destructive or bulk actions
- Error messages must state cause + how to fix
- Multi-step flows show step indicator; allow back navigation
- After submit error, auto-focus the first invalid field

## 9. Navigation Patterns (HIGH)

- Bottom navigation max 5 items; use labels with icons
- Back navigation must be predictable and consistent
- All key screens must be reachable via deep link/URL
- Navigation items must have both icon and text label
- Current location must be visually highlighted
- Modals must offer clear close/dismiss affordance
- Search must be easily reachable
- Navigating back must restore previous scroll position and state
- Large screens prefer sidebar; small screens use bottom/top nav
- Don't mix Tab + Sidebar + Bottom Nav at same hierarchy level

## 10. Charts & Data (LOW)

- Match chart type to data type (trend → line, comparison → bar, proportion → pie)
- Use accessible color palettes; avoid red/green only pairs
- Provide table alternative for accessibility
- Always show legend near the chart
- Provide tooltips on hover/tap showing exact values
- Charts must reflow or simplify on small screens
- Show meaningful empty state when no data exists
- Avoid pie/donut for >5 categories; switch to bar chart
- Data lines/bars vs background ≥3:1 contrast

## Anti-Patterns to Avoid

### Icons & Visual Elements
- Never use emojis as structural icons — use vector-based icons
- Never use raster PNG icons that blur or pixelate
- Never use layout-shifting transforms that move surrounding content
- Keep consistent icon sizing via design tokens
- Use consistent stroke width within same visual layer

### Common UI Mistakes
- No placeholder-only labels on form fields
- No gray-on-gray text
- No text smaller than 12px for body content
- No raw hex values in components (use semantic tokens)
- No decorative-only animation
- No horizontal scroll on mobile
- No disabled zoom (user-scalable=no)

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons
- [ ] All icons from consistent icon family
- [ ] Semantic theme tokens used consistently
- [ ] Pressed-state visuals don't shift layout

### Interaction
- [ ] All tappable elements provide pressed feedback
- [ ] Touch targets meet minimum size (≥44×44pt)
- [ ] Micro-interaction timing 150-300ms
- [ ] Disabled states visually clear and non-interactive
- [ ] Screen reader focus order matches visual order

### Light/Dark Mode
- [ ] Primary text contrast ≥4.5:1 in both modes
- [ ] Dividers/borders visible in both themes
- [ ] Both themes tested before delivery

### Layout
- [ ] Safe areas respected for headers and bottom bars
- [ ] Scroll content not hidden behind fixed bars
- [ ] Verified on small phone, large phone, and tablet
- [ ] 4/8dp spacing rhythm maintained
- [ ] Long-form text readable on larger devices

### Accessibility
- [ ] All meaningful images/icons have accessibility labels
- [ ] Form fields have labels, hints, and clear error messages
- [ ] Color is not the only indicator
- [ ] Reduced motion and dynamic text size supported
