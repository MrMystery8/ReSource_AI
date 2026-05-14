# Implementation Plan: UI/UX Revamp

## Overview

This plan implements a complete visual layer replacement for the ReSource AI frontend following a 5-phase incremental migration strategy. Each phase produces a working application. The tech stack is React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide React, and React Router v7. All existing functionality, routes, API calls, and data flows remain unchanged — only the presentation layer changes.

## Tasks

- [x] 1. Design System Foundation (Phase 1)
  - [x] 1.1 Create `tokens.css` with semantic color tokens, type scale, spacing scale, elevation scale, and radius scale for both light and dark themes
    - Create `frontend/src/design-system/tokens.css`
    - Define CSS custom properties scoped to `:root, [data-theme="light"]` and `[data-theme="dark"]`
    - Include all semantic color tokens: surface, surface-elevated, surface-card, border-default, border-subtle, text-primary, text-secondary, text-muted, primary, primary-hover, error, success, warning
    - Define elevation scale (sm, md, lg box-shadows) and radius scale (sm: 6px, md: 8px, lg: 12px)
    - Use Tailwind v4 `@theme` directive for shared palette values
    - _Requirements: 1.1, 1.3, 1.5, 1.7_

  - [x] 1.2 Create `typography.css` with type scale utilities and font loading
    - Create `frontend/src/design-system/typography.css`
    - Define type scale classes for sizes 12, 14, 16, 18, 24, 32px with appropriate line-heights (1.5-1.75 body, 1.2-1.4 headings)
    - Map sizes to semantic roles (caption, body-sm, body, subheading, heading, title)
    - Load Inter font with `font-display: swap` and system sans-serif fallback
    - Set font-weight 600-700 for headings, 400 for body
    - _Requirements: 1.2, 1.4, 1.8, 3.1, 3.2, 3.4_

  - [x] 1.3 Create `animations.css` with motion system utilities
    - Create `frontend/src/design-system/animations.css`
    - Define constrained animation durations (150ms, 200ms, 300ms) and easing curves
    - Add `prefers-reduced-motion` media query to suppress non-essential animations
    - Define skeleton pulse animation using opacity (not background-position)
    - _Requirements: 5.5, 5.6, 10.7_

  - [x] 1.4 Create `tokens.ts` TypeScript type definitions for design tokens
    - Create `frontend/src/design-system/tokens.ts`
    - Export TypeScript interfaces: ColorTokens, ThemeTokens, TypeScaleEntry, SpacingScale, ElevationScale, RadiusScale
    - Export token value constants for use in property-based tests
    - _Requirements: 1.1, 1.6_

  - [x] 1.5 Create `ThemeContext.tsx` with theme provider, resolution logic, and persistence
    - Create `frontend/src/contexts/ThemeContext.tsx`
    - Implement `ThemeProvider` component and `useTheme` hook
    - Resolve theme priority: localStorage → OS `prefers-color-scheme` → 'light' fallback
    - Apply `data-theme` attribute to `document.documentElement`
    - Persist selection to localStorage; gracefully handle write failures
    - Toggle applies within 100ms without page reload
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 2.9_

  - [x] 1.6 Create reusable UI components: Button, Card, Input, Skeleton, Badge, ThemeToggle, EmptyState, ErrorState
    - Create `frontend/src/components/ui/Button.tsx` with primary, secondary, destructive variants and states (default, hover, active scale 0.97, focus ring, disabled)
    - Create `frontend/src/components/ui/Card.tsx` with solid background, elevation prop (sm/md/lg), border-radius from scale
    - Create `frontend/src/components/ui/Input.tsx` with visible label above field, error message below, focus ring
    - Create `frontend/src/components/ui/Skeleton.tsx` with text/circular/rectangular variants, respects reduced-motion
    - Create `frontend/src/components/ui/Badge.tsx` with WCAG AA contrast-compliant foreground/background pairs
    - Create `frontend/src/components/ui/ThemeToggle.tsx` with Sun/Moon icon, aria-label, 44×44px touch target
    - Create `frontend/src/components/ui/EmptyState.tsx` with icon + message + CTA structure
    - Create `frontend/src/components/ui/ErrorState.tsx` with error icon + message + retry button
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.8, 8.1, 8.2, 8.4_

- [x] 2. Layout Shell and Navigation (Phase 1 continued)
  - [x] 2.1 Create `AppShell.tsx` layout wrapper component
    - Create `frontend/src/components/layout/AppShell.tsx`
    - Render SkipLink as first focusable element
    - Render DesktopHeader (hidden below 768px) and MobileBottomNav (hidden at 768px+)
    - Render `<main id="main-content">` with max-w-6xl, centered, responsive padding (16px mobile, 24px desktop)
    - Apply bottom padding on mobile to account for fixed bottom nav height + 16px
    - Render RouteAnnouncer for screen reader announcements
    - _Requirements: 4.1, 4.2, 6.1, 6.2, 6.5_

  - [x] 2.2 Create `DesktopHeader.tsx` with horizontal navigation, theme toggle, and profile dropdown
    - Create `frontend/src/components/layout/DesktopHeader.tsx`
    - Render simplified logo (no glow/animation), horizontal nav links with icon + text label
    - Highlight active nav item with primary color background treatment (3:1 contrast vs inactive)
    - Include ThemeToggle button and user profile dropdown (avatar, name, level badge, logout)
    - Support keyboard navigation with visible focus rings (2-4px)
    - _Requirements: 4.1, 4.3, 4.6, 4.7, 5.1, 5.2, 5.3_

  - [x] 2.3 Create `MobileBottomNav.tsx` with fixed bottom navigation bar
    - Create `frontend/src/components/layout/MobileBottomNav.tsx`
    - Fixed to bottom of viewport, max 5 items (Triage, History, Leaderboard, Profile, Admin for managers)
    - Each item: icon + text label, 44×44px minimum touch target, 8px spacing between items
    - Active item highlighted with primary color
    - Safe area padding for devices with home indicators
    - _Requirements: 4.2, 4.3, 4.5, 9.4_

  - [x] 2.4 Create `SkipLink.tsx` and `RouteAnnouncer.tsx` accessibility components
    - Create `frontend/src/components/layout/SkipLink.tsx` — visually hidden, visible on focus, links to `#main-content`, first focusable element
    - Create `frontend/src/components/layout/RouteAnnouncer.tsx` — listens to route changes, updates `aria-live="polite"` region with page title, moves focus to main content
    - _Requirements: 4.8, 10.4, 10.8_

  - [x] 2.5 Create `useScrollRestoration.ts` hook for scroll position management
    - Create `frontend/src/hooks/useScrollRestoration.ts`
    - Preserve scroll position per route on navigation
    - Restore position when navigating back
    - Retain positions for browser session duration
    - _Requirements: 4.4_

- [x] 3. Checkpoint - Verify Phase 1 builds successfully
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. App Shell Integration (Phase 2)
  - [x] 4.1 Update `index.css` to import new design system files and remove deprecated styles
    - Replace current `@theme` block with import of `tokens.css`
    - Add imports for `typography.css` and `animations.css`
    - Remove `bg-gradient-animated`, `glass-card`, `glow-primary`, `glow-emerald`, `particles-bg`, `particle`, and `float-up` keyframes
    - Keep custom scrollbar styles (updated to use semantic tokens)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.2 Update `App.tsx` to use ThemeProvider and AppShell, remove ParticlesBackground
    - Wrap content with `ThemeProvider` (inside `AuthProvider`)
    - Replace `ParticlesBackground`, `bg-gradient-animated`, and old layout div with `AppShell`
    - Remove `Header` import (replaced by DesktopHeader inside AppShell)
    - Preserve `ErrorBoundary` and `AuthProvider` wrapping
    - Ensure `Outlet` renders inside AppShell's main content area
    - _Requirements: 5.1, 5.2, 11.1, 11.3_

  - [x] 4.3 Update `index.html` viewport meta tag and add Inter font preload
    - Ensure viewport meta has `width=device-width, initial-scale=1` without `user-scalable=no` or `maximum-scale < 2.0`
    - Add preconnect/preload for Inter font from Google Fonts or local
    - _Requirements: 9.5, 3.1_

- [x] 5. Page Visual Refresh (Phase 3)
  - [x] 5.1 Update `LoginPage.tsx` and `RegisterPage.tsx` to use new design system components
    - Replace `glass-card` with `Card` component
    - Replace inline input styles with `Input` component (visible labels above fields)
    - Replace inline button styles with `Button` component (primary variant)
    - Use semantic token classes for colors and spacing
    - Preserve all form logic, validation, API calls, and navigation unchanged
    - _Requirements: 7.1, 7.2, 7.3, 7.7, 11.2, 11.3_

  - [x] 5.2 Update `TriagePage.tsx` and form components to use new design system
    - Replace any `glass-card` or glow effects with Card component
    - Update `TriageForm.tsx` to use Input and Button components
    - Update `FileUploader.tsx` to use new card/button styles
    - Preserve all submission logic, file upload, gamification, and navigation unchanged
    - _Requirements: 7.1, 7.2, 7.3, 8.3, 11.2, 11.5_

  - [x] 5.3 Update `HistoryPage.tsx` and `SessionDetailPage.tsx` to use new design system
    - Replace glass-card with Card component
    - Add Skeleton screens for loading states (>300ms)
    - Add EmptyState component when no sessions exist
    - Add ErrorState component with retry for failed fetches
    - Preserve all data fetching, navigation, and display logic unchanged
    - _Requirements: 7.3, 8.1, 8.2, 8.4, 11.5_

  - [x] 5.4 Update `LeaderboardPage.tsx` to use new design system and replace emoji medals with Lucide icons
    - Replace `glass-card` with Card component
    - Replace emoji rank medals (🥇🥈🥉) with Lucide SVG icons (Medal, Award, or custom)
    - Use tabular/monospaced figures for points column
    - Adapt table layout for mobile (stack or horizontal scroll within container)
    - Preserve all data fetching and display logic unchanged
    - _Requirements: 7.4, 3.5, 9.3, 11.4_

  - [x] 5.5 Update `ProfilePage.tsx` to use new design system and replace emoji badge icons
    - Replace `glass-card` with Card component
    - Replace emoji badge icons with Lucide SVG icons
    - Use tabular figures for points and stats display
    - Update Toast component to use semantic tokens
    - Preserve all profile editing, stats fetching, and gamification display unchanged
    - _Requirements: 7.4, 3.5, 7.6, 11.4_

  - [x] 5.6 Update `AdminPage.tsx` to use new design system
    - Replace glass-card with Card component
    - Adapt table layout for mobile viewports (stack or scroll)
    - Use Button component for actions (destructive variant for delete/ban)
    - Preserve all admin management logic unchanged
    - _Requirements: 7.1, 7.3, 9.3, 11.6_

  - [x] 5.7 Update `ImplementationGuidePage.tsx` and remaining components to use new design system
    - Replace glass-card and glow effects with Card component
    - Update ResultsView, StageCard, IdeaCard, ImpactCard, RiskBadge to use semantic tokens
    - Ensure line-length constraint (65-75 chars) on body text containers at ≥1024px
    - Preserve all logic unchanged
    - _Requirements: 3.3, 6.3, 7.3, 11.5_

- [x] 6. Checkpoint - Verify Phase 3 builds and all pages render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Cleanup and Deprecation Removal (Phase 4)
  - [x] 7.1 Remove deprecated components and CSS classes
    - Delete `frontend/src/components/ParticlesBackground.tsx`
    - Remove old `Header.tsx` (replaced by DesktopHeader)
    - Remove any remaining references to `glass-card`, `glow-primary`, `glow-emerald`, `bg-gradient-animated`, `particles-bg` from all files
    - Verify no component imports the deleted files
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.2 Audit and fix accessibility across all pages
    - Verify all icon-only buttons have `aria-label` attributes
    - Verify sequential heading levels (h1→h6) without skips on each page
    - Verify semantic HTML elements (nav, main, header, section) with unique aria-labels for duplicate landmarks
    - Verify all form inputs have visible labels with `htmlFor` attribute
    - Verify no information conveyed by color alone (add icon/text accompaniment)
    - Verify tab order matches visual order without positive tabindex values
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 7.3 Implement async operation announcements and modal focus trapping
    - Add `aria-live="polite"` announcements for successful async operations
    - Add `aria-live="assertive"` announcements for failed async operations
    - Implement focus trap for any modal/overlay (profile dropdown, mobile menu): Tab/Shift+Tab cycle within, Escape dismisses, focus returns to trigger
    - _Requirements: 10.9, 10.10_

  - [x] 7.4 Verify responsive behavior and layout constraints
    - Verify no horizontal scrolling on viewports 320px and up
    - Verify mobile-first CSS with breakpoints at 375px, 768px, 1024px, 1440px
    - Verify all images/media constrained to max-width 100% of container
    - Verify `min-h-dvh` used instead of `100vh` on mobile full-height layouts
    - Reserve space for async content (CLS target < 0.1)
    - _Requirements: 6.4, 6.6, 9.1, 9.2, 9.5, 9.6, 8.6_

- [x] 8. Checkpoint - Full application verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Property-Based Tests (Phase 5)
  - [ ]* 9.1 Set up fast-check testing infrastructure
    - Install `fast-check` as a dev dependency
    - Configure Vitest (or existing test runner) for property-based tests
    - Create test utilities for token parsing and contrast ratio calculation
    - _Requirements: 1.1, 2.6, 2.7_

  - [ ]* 9.2 Write property test for theme resolution priority
    - **Property 1: Theme Resolution Priority**
    - Generate random (localStorage state, OS preference) combinations
    - Verify resolution follows strict priority: localStorage → OS preference → 'light' fallback
    - Minimum 100 iterations
    - **Validates: Requirements 2.2**

  - [ ]* 9.3 Write property test for theme persistence round-trip
    - **Property 2: Theme Persistence Round-Trip**
    - Generate random valid theme values ('light' | 'dark')
    - Verify localStorage round-trip returns same value
    - Minimum 100 iterations
    - **Validates: Requirements 2.3**

  - [ ]* 9.4 Write property test for WCAG AA contrast compliance
    - **Property 3: WCAG AA Contrast Compliance**
    - Generate all text/background token pairs × both themes
    - Compute contrast ratio and verify ≥ 4.5:1 for normal text, ≥ 3:1 for large text
    - Minimum 100 iterations
    - **Validates: Requirements 2.6, 2.7, 10.1**

  - [ ]* 9.5 Write property test for active navigation highlighting
    - **Property 4: Active Navigation Highlighting**
    - Generate random valid route paths from NAV_ITEMS
    - Verify exactly one nav item highlighted with primary color, all others inactive
    - Minimum 100 iterations
    - **Validates: Requirements 4.3, 4.9**

  - [ ]* 9.6 Write property test for button variant state distinctness
    - **Property 5: Button Variant State Distinctness**
    - Generate all (variant, state-pair) combinations
    - Verify computed styles differ by background-color, border-color, or opacity
    - Minimum 100 iterations
    - **Validates: Requirements 7.1**

  - [ ]* 9.7 Write property test for badge and tag contrast compliance
    - **Property 6: Badge and Tag Contrast Compliance**
    - Generate badge/tag instances in both themes
    - Verify foreground/background contrast ≥ 4.5:1
    - Minimum 100 iterations
    - **Validates: Requirements 7.6**

  - [ ]* 9.8 Write property test for modal focus trap
    - **Property 7: Modal Focus Trap**
    - Generate modal open scenarios with varying focusable element counts
    - Verify Tab/Shift+Tab cycle within modal, Escape dismisses, focus returns to trigger
    - Minimum 100 iterations
    - **Validates: Requirements 10.10**

  - [ ]* 9.9 Write property test for protected route redirect preservation
    - **Property 8: Protected Route Redirect Preservation**
    - Generate random protected route paths
    - Verify redirect to `/login` preserves original path and restores after auth
    - Minimum 100 iterations
    - **Validates: Requirements 11.7**

- [ ] 10. Integration Tests (Phase 5 continued)
  - [ ]* 10.1 Write integration tests for theme switching and functional preservation
    - Test theme toggle updates all visible elements without page reload
    - Test all existing routes remain accessible and render correctly
    - Test authentication flows (login, register, protected route redirect) unchanged
    - Test API data flows (triage submission, history loading, leaderboard fetch) unchanged
    - _Requirements: 2.4, 2.8, 11.1, 11.2, 11.3, 11.5_

  - [ ]* 10.2 Write integration tests for responsive layout and keyboard navigation
    - Test no horizontal overflow at 320px, 375px, 768px, 1024px, 1440px viewports
    - Test keyboard tab-through with visible focus rings in logical order
    - Test scroll restoration on back navigation
    - Test skip-to-main-content link visibility on focus
    - _Requirements: 4.4, 4.7, 4.8, 9.2, 9.4_

- [x] 11. Final Checkpoint - All tests pass, build succeeds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All existing functionality (routes, API calls, auth flows, gamification) is preserved unchanged — only the visual layer changes
- The migration is incremental: each phase produces a working application

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5"] },
    { "id": 2, "tasks": ["1.6", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["9.1"] },
    { "id": 9, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9"] },
    { "id": 10, "tasks": ["10.1", "10.2"] }
  ]
}
```
