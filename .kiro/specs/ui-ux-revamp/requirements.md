# Requirements Document

## Introduction

Complete UI/UX revamp of the ReSource AI webapp. The current interface relies on a dark-only theme with animated gradients, floating particles, glassmorphism cards, and glow effects that produce a generic "AI slop" aesthetic. This overhaul replaces the entire visual layer — layout, navigation, typography, color system, spacing, and theming — with a clean, professional design inspired by Linear, Vercel, and Stripe. All existing functionality remains unchanged; only the presentation and interaction quality improve.

## Glossary

- **Design_System**: The centralized set of semantic color tokens, type scale, spacing scale, and component styles that govern the visual appearance of the application
- **Theme_Provider**: The React context and CSS mechanism that manages light/dark mode switching and persists user preference
- **Navigation_Shell**: The top-level layout component containing the header, sidebar (desktop), bottom nav (mobile), and main content area
- **Page_Component**: Any route-level React component (LoginPage, TriagePage, HistoryPage, SessionDetailPage, ProfilePage, LeaderboardPage, AdminPage, ImplementationGuidePage)
- **Semantic_Token**: A CSS custom property named by purpose (e.g., --color-surface, --color-text-primary) rather than by raw value
- **Type_Scale**: The defined set of font sizes (12, 14, 16, 18, 24, 32px) used consistently across the application
- **Spacing_System**: The 4pt/8dp incremental spacing grid used for all margins, paddings, and gaps
- **Skeleton_Screen**: A placeholder UI showing the shape of content while data loads, replacing spinners for operations exceeding 300ms
- **Focus_Ring**: A visible 2-4px outline on interactive elements when focused via keyboard navigation
- **Motion_System**: The constrained set of animation durations (150-300ms), easing curves, and transform-only properties used for meaningful transitions

## Requirements

### Requirement 1: Design System Foundation

**User Story:** As a developer, I want a centralized design system with semantic tokens, type scale, and spacing scale, so that the entire application has a consistent, maintainable visual language.

#### Acceptance Criteria

1. THE Design_System SHALL define semantic color tokens for both light and dark themes covering: surface, surface-elevated, surface-card, border-default, border-subtle, text-primary, text-secondary, text-muted, primary, primary-hover, error, success, and warning
2. THE Design_System SHALL define a type scale using sizes 12, 14, 16, 18, 24, and 32 pixels with line-heights between 1.5 and 1.75 for body text (14-18px) and line-heights between 1.2 and 1.4 for headings (24-32px)
3. THE Design_System SHALL define a spacing scale based on 4px increments (4, 8, 12, 16, 20, 24, 32, 40, 48, 64 pixels)
4. THE Design_System SHALL specify a font pairing with a sans-serif display font for headings (weight 600-700) and a sans-serif body font for content (weight 400)
5. THE Design_System SHALL define an elevation scale using box-shadow values at 3 levels (sm, md, lg) where each level produces a minimum 1px visible shadow offset in both light and dark themes
6. WHEN a component references a color, THE Design_System SHALL require the use of semantic tokens rather than raw hex or RGB values
7. THE Design_System SHALL define border-radius values at 3 levels (sm: 6px, md: 8px, lg: 12px) used consistently across all components
8. THE Design_System SHALL map type scale sizes to semantic roles: 12px for captions and metadata, 14px for secondary body text, 16px for primary body text, 18px for subheadings, 24px for section headings, and 32px for page titles

### Requirement 2: Light and Dark Theme Support

**User Story:** As a user, I want to switch between light and dark themes, so that I can use the application comfortably in any lighting environment.

#### Acceptance Criteria

1. THE Theme_Provider SHALL support two themes: light and dark
2. WHEN the application loads, THE Theme_Provider SHALL resolve the active theme using the following priority order: (1) previously persisted selection in localStorage, (2) the operating system preference via the prefers-color-scheme media query, (3) light theme as the default fallback if neither is available
3. WHEN the user selects a theme, THE Theme_Provider SHALL persist the selection in localStorage
4. WHEN the user toggles the theme, THE Theme_Provider SHALL apply the new theme within 100ms without a full page reload
5. THE Theme_Provider SHALL expose a toggle control within the Navigation_Shell on all pages that is keyboard-operable and provides an accessible label indicating the current theme state for screen readers
6. WHILE the light theme is active, THE Design_System SHALL ensure all text-to-background pairs meet WCAG AA contrast ratio of 4.5:1 for normal text and 3:1 for large text
7. WHILE the dark theme is active, THE Design_System SHALL ensure all text-to-background pairs meet WCAG AA contrast ratio of 4.5:1 for normal text and 3:1 for large text, using desaturated color variants with reduced saturation relative to light theme equivalents rather than simple color inversion
8. THE Theme_Provider SHALL apply theme changes to all Page_Components without requiring page navigation
9. IF localStorage is unavailable or write fails, THEN THE Theme_Provider SHALL continue to apply the selected theme for the current session without persisting and without displaying an error to the user

### Requirement 3: Typography System

**User Story:** As a user, I want clear, readable text with intentional hierarchy, so that I can scan and comprehend content efficiently.

#### Acceptance Criteria

1. THE Design_System SHALL load and apply Inter as the primary typeface with font-display: swap to prevent invisible text during loading, falling back to the system sans-serif font stack (system-ui, -apple-system, sans-serif)
2. THE Design_System SHALL enforce a minimum body text size of 16px on all viewport sizes
3. WHILE the viewport width is 1024px or greater, THE Design_System SHALL limit line length to 65-75 characters for body text containers
4. THE Design_System SHALL use font-weight 600-700 for headings and 400 for body text to reinforce visual hierarchy
5. THE Design_System SHALL use tabular (monospaced) figures for data columns, point values, and numerical displays in the LeaderboardPage and ProfilePage
6. THE Design_System SHALL maintain sequential heading levels (h1 through h6) without skipping levels on any Page_Component

### Requirement 4: Navigation Redesign

**User Story:** As a user, I want clear, predictable navigation that highlights my current location, so that I can move between sections without confusion.

#### Acceptance Criteria

1. WHILE the viewport width is 768px or greater, THE Navigation_Shell SHALL display a top header bar with horizontal navigation links containing both icon and text label for each destination
2. WHILE the viewport width is less than 768px, THE Navigation_Shell SHALL display a fixed bottom navigation bar with a maximum of 5 items, each showing an icon and text label
3. THE Navigation_Shell SHALL visually highlight the currently active navigation item by applying the Design_System primary semantic token as the text/icon color and a distinguishable background treatment, ensuring the active item meets a minimum 3:1 contrast ratio against adjacent inactive items
4. WHEN the user navigates to a new page, THE Navigation_Shell SHALL preserve the previous page's scroll position and restore it when the user navigates back, retaining positions for the duration of the browser session
5. THE Navigation_Shell SHALL provide a minimum touch target size of 44x44 pixels for all navigation items with at least 8px spacing between them
6. THE Navigation_Shell SHALL display the theme toggle control within the top header bar on desktop viewports and within the top area of the screen on mobile viewports, rendered in the same position on every page
7. THE Navigation_Shell SHALL support full keyboard navigation with visible focus rings (2-4px) on all interactive elements, following a left-to-right tab order matching the visual sequence of navigation items
8. THE Navigation_Shell SHALL include a skip-to-main-content link that is visually hidden by default and becomes visible when it receives keyboard focus, positioned as the first focusable element in the DOM
9. IF the current route does not match any navigation item, THEN THE Navigation_Shell SHALL render all navigation items in their inactive state without highlighting any item

### Requirement 5: Remove Decorative Visual Effects

**User Story:** As a user, I want a clean interface without distracting visual noise, so that I can focus on the content and tasks.

#### Acceptance Criteria

1. THE Page_Component SHALL NOT render the ParticlesBackground component or any floating particle animations
2. THE Page_Component SHALL NOT use the bg-gradient-animated class or any animated background gradients
3. THE Page_Component SHALL NOT apply glow-primary or glow-emerald box-shadow effects
4. THE Page_Component SHALL replace the glass-card class with a solid surface card style using the Design_System elevation scale and border tokens
5. THE Page_Component SHALL use only purposeful animations (150-300ms duration, transform/opacity only) that convey cause-and-effect relationships
6. WHEN the user has prefers-reduced-motion enabled, THE Page_Component SHALL disable all non-essential animations

### Requirement 6: Page Layout System

**User Story:** As a user, I want consistent page layouts with proper spacing and content width, so that the interface feels cohesive and readable.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or greater, THE Page_Component SHALL constrain the main content area to a maximum width of max-w-6xl (72rem) and center it horizontally within the viewport
2. WHILE the viewport width is less than 768px, THE Page_Component SHALL apply horizontal padding of 16px to the main content area, and WHILE the viewport width is 768px or greater, THE Page_Component SHALL apply horizontal padding of 24px
3. THE Page_Component SHALL use the Spacing_System for all internal margins, paddings, and gaps
4. THE Page_Component SHALL ensure no horizontal scrolling occurs on any viewport width from 320px upward
5. WHILE the viewport width is less than 768px, THE Page_Component SHALL reserve bottom padding equal to the height of the fixed bottom navigation bar plus 16px to prevent content from being obscured
6. WHILE the viewport width is less than 768px, THE Page_Component SHALL use min-h-dvh instead of 100vh for full-height layouts to account for dynamic browser chrome

### Requirement 7: Component Visual Refresh

**User Story:** As a user, I want buttons, inputs, cards, and badges to look polished and consistent, so that the interface feels professional and trustworthy.

#### Acceptance Criteria

1. THE Design_System SHALL define button styles in at least three variants (primary, secondary, and destructive) with visually distinct states for default, hover, active, focus, and disabled conditions, where each state differs from adjacent states by background color, border color, or opacity
2. THE Design_System SHALL define input field styles with visible label elements positioned above the field (not placeholder-only), a 1px border using the border-default semantic token, and a focus state that displays the Focus_Ring (2-4px outline) using the primary color token
3. THE Design_System SHALL define card styles using solid backgrounds from the semantic surface tokens, the elevation scale for depth, and the border-radius scale defined in the Design_System (sm: 6px, md: 8px, lg: 12px)
4. THE Design_System SHALL replace all emoji icons used for decorative or informational purposes (including rank medals and badge icons) with SVG icons from the Lucide React icon set
5. THE Design_System SHALL ensure all interactive elements provide visual feedback on press within 150ms using transform scale (0.95-0.98) or opacity change without causing layout shift (no change to element width, height, or margin)
6. THE Design_System SHALL define badge and tag styles with foreground-to-background color pairs meeting WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text) in both light and dark themes
7. IF a form submission fails validation, THEN THE Page_Component SHALL display an error message adjacent to and directly below the relevant field and programmatically move focus to the first invalid field
8. THE Design_System SHALL ensure all button and interactive component touch targets meet a minimum size of 44x44 pixels on viewports below 768px

### Requirement 8: Loading and Empty States

**User Story:** As a user, I want clear feedback when content is loading or unavailable, so that I understand the application state at all times.

#### Acceptance Criteria

1. WHEN data loading exceeds 300ms, THE Page_Component SHALL display a Skeleton_Screen that reflects the layout structure of the expected content (number of rows, card shapes, or text blocks)
2. WHEN a page has no data to display, THE Page_Component SHALL show an empty state containing: an illustrative icon, a single-sentence message stating why no data is present, and a call-to-action button or link directing the user to a relevant next step
3. WHEN an asynchronous operation begins, THE Page_Component SHALL disable the triggering button and display a spinner or progress indicator within 100ms of initiation; WHEN the operation completes (success or failure), THE Page_Component SHALL re-enable the button and remove the progress indicator within 100ms
4. WHEN a network request fails, THE Page_Component SHALL display an error state containing: an error icon, a message identifying the type of failure (e.g., connection lost, server error, timeout), and a retry button that re-initiates the failed request
5. IF a retry action also fails, THEN THE Page_Component SHALL continue displaying the error state with the retry button available for subsequent attempts
6. THE Page_Component SHALL reserve space for asynchronous content to prevent cumulative layout shift (CLS target below 0.1)

### Requirement 9: Responsive Behavior

**User Story:** As a user, I want the application to work well on my phone, tablet, and desktop, so that I can use it on any device.

#### Acceptance Criteria

1. THE Page_Component SHALL use mobile-first CSS with breakpoints at 375px, 768px, 1024px, and 1440px
2. THE Page_Component SHALL render all content without horizontal overflow on viewports as narrow as 320px
3. WHILE the viewport width is less than 768px, THE Page_Component SHALL adapt table layouts on the LeaderboardPage and AdminPage to either stack rows vertically or scroll horizontally within a container that does not exceed the viewport width
4. WHILE the viewport width is less than 768px, THE Page_Component SHALL ensure all interactive elements meet a minimum touch target size of 44x44 pixels with at least 8px spacing between adjacent targets
5. THE Page_Component SHALL include a viewport meta tag with width=device-width and initial-scale=1, and SHALL NOT include user-scalable=no or a maximum-scale value less than 2.0
6. THE Page_Component SHALL constrain all images and embedded media to a maximum width of 100% of their containing element to prevent overflow on any viewport size

### Requirement 10: Accessibility Compliance

**User Story:** As a user with assistive technology, I want the application to be navigable and understandable, so that I can use all features independently.

#### Acceptance Criteria

1. THE Page_Component SHALL ensure all foreground-to-background color pairs meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text defined as 18px and above or 14px bold and above)
2. THE Page_Component SHALL provide aria-label attributes on all icon-only buttons where the label describes the action performed (e.g., "Close dialog", "Toggle theme")
3. THE Page_Component SHALL maintain a logical tab order that matches the visual left-to-right, top-to-bottom reading order without using positive tabindex values
4. THE Page_Component SHALL use semantic HTML elements (nav, main, header, section, article) for document structure and SHALL provide unique aria-label attributes when multiple landmarks of the same type exist on a page
5. THE Page_Component SHALL not convey information through color alone — all color-coded elements shall include an accompanying icon or text label
6. THE Page_Component SHALL associate all form inputs with visible label elements using the htmlFor attribute
7. WHEN the user activates prefers-reduced-motion, THE Motion_System SHALL suppress all animations and transitions except those that indicate an active loading state or provide direct feedback to a user-initiated action
8. WHEN a SPA route change occurs, THE Page_Component SHALL move focus to the main content area or page heading and announce the new page title to assistive technology via an ARIA live region
9. WHEN an asynchronous operation completes or fails, THE Page_Component SHALL announce the status change to screen readers using an ARIA live region with politeness level "polite" for success and "assertive" for errors
10. IF a modal or overlay is open, THEN THE Page_Component SHALL trap keyboard focus within the modal, allow dismissal via the Escape key, and return focus to the triggering element upon close

### Requirement 11: Functional Preservation

**User Story:** As a product owner, I want all existing features to continue working identically after the visual overhaul, so that no user workflows are broken.

#### Acceptance Criteria

1. THE Page_Component SHALL preserve all existing route paths (/, /login, /register, /history, /history/:sessionId, /profile, /leaderboard, /admin, /guide/:projectId) without modification
2. THE Page_Component SHALL preserve all form submission behaviors, API calls, and data flows without modification to request payloads, response handling, or endpoint URLs
3. THE Page_Component SHALL preserve all authentication flows including: login form submission, registration form submission, ProtectedRoute redirect to /login for unauthenticated users, and ManagerRoute restriction for non-manager roles
4. THE Page_Component SHALL preserve all gamification displays (points, levels, badges, leaderboard rankings) without modification to data fetching, calculation, or display logic
5. THE Page_Component SHALL preserve all session history, detail viewing, and triage submission workflows without modification
6. THE Page_Component SHALL preserve all admin management capabilities without modification
7. IF an unauthenticated user attempts to access a protected route, THEN THE Page_Component SHALL redirect to /login and return the user to the originally requested route upon successful authentication
8. THE Page_Component SHALL preserve all data contracts between frontend components and backend API responses without modification to type interfaces or response parsing logic
