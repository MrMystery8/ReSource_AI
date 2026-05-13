# Implementation Plan: Frontend Auth, History, Admin & Gamification

## Overview

This plan adds frontend routing, authentication UI, session history, admin panel, and a full gamification system (points, badges, levels, streaks, leaderboard) to ReSource AI. It builds on the already-implemented backend auth endpoints and extends the backend with gamification logic and new endpoints.

## Tasks

- [x] 1. Add frontend dependencies and routing setup
  - [x] 1.1 Install React Router and set up route structure
    - Install `react-router-dom` in frontend/package.json
    - Create `frontend/src/router.tsx` with route definitions for: `/login`, `/register`, `/`, `/history`, `/history/:sessionId`, `/profile`, `/leaderboard`, `/admin`
    - Update `frontend/src/main.tsx` to wrap App with BrowserRouter
    - Update `frontend/src/App.tsx` to render `<Outlet />` from router instead of inline form/results logic
    - _Requirements: 1.1_

  - [x] 1.2 Create ProtectedRoute and ManagerRoute wrapper components
    - Create `frontend/src/components/auth/ProtectedRoute.tsx` — redirects to `/login` if not authenticated, preserves intended URL
    - Create `frontend/src/components/auth/ManagerRoute.tsx` — redirects to `/` with toast if role !== 'manager'
    - Apply ProtectedRoute to all routes except `/login` and `/register`
    - Apply ManagerRoute to `/admin` route
    - _Requirements: 1.3, 1.4, 7.2_

- [x] 2. Implement Auth Context and API client
  - [x] 2.1 Create AuthContext provider
    - Create `frontend/src/contexts/AuthContext.tsx`
    - Implement AuthProvider with state: user, token, isAuthenticated, isLoading
    - Implement login function: call API, store token in localStorage, set user state
    - Implement register function: call API, store token in localStorage, set user state
    - Implement logout function: clear localStorage, clear state, redirect to /login
    - On mount: read token from localStorage, validate by calling GET /auth/profile, set user or clear if expired
    - Listen for 'auth:expired' window event to trigger logout
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 2.2 Refactor API service to use auth headers
    - Refactor `frontend/src/services/api.ts` into a class-based ApiClient
    - Accept a `getToken` function that reads from AuthContext
    - Include `Authorization: Bearer <token>` header on all protected requests
    - Include `x-api-key` header on all requests
    - Dispatch 'auth:expired' event on 401 responses
    - Add methods: register, login, getProfile, updateProfile, getStats, getLeaderboard, getUserSessions, getAdminUsers, updateUserRole, getAdminSessions
    - _Requirements: 4.2, 4.3, 4.6_

- [x] 3. Implement auth pages
  - [x] 3.1 Implement LoginPage component
    - Create `frontend/src/pages/LoginPage.tsx`
    - Render email and password fields with glassmorphism card styling
    - Validate non-empty fields before enabling submit
    - Call AuthContext.login on submit
    - Display "Invalid credentials" error on failure
    - Redirect to intended page on success (read from location state or default to `/`)
    - Include link to `/register`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Implement RegisterPage component
    - Create `frontend/src/pages/RegisterPage.tsx`
    - Render email, password, confirm password, and display name fields
    - Validate: email format, password >= 8 chars, confirm matches, displayName non-empty (max 100)
    - Show inline validation errors (debounced 300ms)
    - Call AuthContext.register on submit
    - Display server errors (409 "Email already registered") as toast
    - Redirect to `/` on success
    - Include link to `/login`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Implement navigation bar
  - [x] 4.1 Update NavBar with auth-aware navigation
    - Refactor `frontend/src/components/Header.tsx` into a full NavBar with navigation links
    - When authenticated: show links to Triage, History, Leaderboard; show user's level badge + points; show profile dropdown with Profile and Logout options
    - When unauthenticated: show Login and Register links
    - For managers: show Admin link in navigation
    - Mobile responsive: hamburger menu on small screens
    - _Requirements: 1.2, 1.5_

- [x] 5. Implement profile and history pages
  - [x] 5.1 Implement ProfilePage component
    - Create `frontend/src/pages/ProfilePage.tsx`
    - Display user info: display name (editable), email (read-only), role, member since
    - Inline edit for display name with save button (calls PUT /auth/profile)
    - Display gamification section: level with progress bar, points, streak indicator, badges grid
    - Show earned badges as colored cards, unearned as greyed silhouettes
    - Success/error toasts on profile update
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Implement HistoryPage component
    - Create `frontend/src/pages/HistoryPage.tsx`
    - Fetch user's sessions from GET /sessions endpoint
    - Display as a list of cards: device name, risk level badge, salvage score, date, status
    - Implement pagination (load more button or infinite scroll)
    - Click on a session card navigates to `/history/:sessionId`
    - Empty state: illustration + "Start your first triage" CTA button linking to `/`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.3 Implement SessionDetailPage component
    - Create `frontend/src/pages/SessionDetailPage.tsx`
    - Fetch session by ID from GET /sessions/{sessionId}
    - Reuse existing `ResultsView` component to display full triage results
    - Add back button to return to history
    - Show 404 state if session not found
    - _Requirements: 6.5_

- [x] 6. Implement admin panel
  - [x] 6.1 Implement AdminPage component
    - Create `frontend/src/pages/AdminPage.tsx`
    - Tabbed interface: "Users" tab and "Sessions" tab
    - Users tab: paginated table (display name, email, role, joined date), role dropdown to change roles
    - Sessions tab: paginated table (session ID, user email, device name, risk level, status, date), optional userId filter
    - Fetch from GET /admin/users and GET /admin/sessions
    - Role change calls PUT /admin/users/{userId}/role with confirmation dialog
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 7. Implement gamification backend
  - [x] 7.1 Add gamification types to shared package
    - Add to `shared/src/types.ts`: UserLevel type, UserStatsResponse, BadgeInfo, LeaderboardEntry, LeaderboardResponse, UserSessionsResponse, SessionSummary interfaces
    - Add BADGE_DEFINITIONS constant to `shared/src/constants.ts`
    - Add LEVEL_THRESHOLDS constant to `shared/src/constants.ts`
    - Add POINTS_CONFIG constant (base: 100, photoBonus: 25, greenBonus: 50, detailedInputBonus: 25)
    - _Requirements: 8.1, 8.3_

  - [x] 7.2 Implement GamificationService module
    - Create `backend/src/gamification/gamification-service.ts`
    - Implement `awardSessionPoints(userId: string, session: TriageSession): Promise<PointsResult>` — calculates base + bonuses
    - Implement `updateStreak(userId: string, lastTriageDate: string | null): number` — returns new streak value
    - Implement `checkBadges(userId: string, stats: UserStats, session: TriageSession): string[]` — returns newly earned badge IDs
    - Implement `calculateLevel(points: number): UserLevel` — maps points to level tier
    - Implement `processSessionCompletion(userId: string, session: TriageSession): Promise<GamificationResult>` — orchestrates all above, writes to DynamoDB
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.7_

  - [x] 7.3 Update pipeline orchestrator to trigger gamification
    - In `backend/src/handlers/pipeline.ts`, after `markSessionComplete`, call `GamificationService.processSessionCompletion(userId, session)`
    - Handle gamification errors gracefully (log but don't fail the session)
    - _Requirements: 8.7_

  - [x] 7.4 Implement user stats endpoint
    - Add GET /auth/stats route to auth handler (or create new handler)
    - Return: points, level, streak, badges (with full badge info), totalSessions, lastTriageDate, pointsToNextLevel, nextLevel
    - _Requirements: 8.6, 10.2_

  - [x] 7.5 Implement leaderboard endpoint
    - Create `backend/src/handlers/leaderboard.ts` or add to auth handler
    - Scan users table, sort by points descending, return top 20
    - Include current user's rank in response
    - _Requirements: 9.6, 10.3_

  - [x] 7.6 Implement user sessions endpoint
    - Add GET /sessions route (without {sessionId}) to poll handler or create new handler
    - Query userId-index GSI for current user's sessions
    - Return paginated SessionSummary list (extract deviceName from quickVerdict, riskLevel from safetyGate)
    - Sort by createdAt descending
    - _Requirements: 10.1_

- [x] 8. Update CDK infrastructure for new endpoints
  - [x] 8.1 Add new API Gateway routes and Lambda permissions
    - Add GET /sessions route (user's own sessions) — protected with authorizer
    - Add GET /auth/stats route — protected with authorizer
    - Add GET /leaderboard route — protected with authorizer
    - Grant auth handler read access to sessions table (for stats/session count)
    - Grant pipeline orchestrator read/write access to users table (for gamification updates)
    - Update any Lambda environment variables needed (USERS_TABLE_NAME for pipeline)
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 9. Implement gamification frontend components
  - [x] 9.1 Implement gamification UI components
    - Create `frontend/src/components/gamification/LevelBadge.tsx` — colored icon with level name and glow
    - Create `frontend/src/components/gamification/PointsAnimation.tsx` — floating "+X points" that fades up
    - Create `frontend/src/components/gamification/BadgeCard.tsx` — badge icon, name, earned date (or greyed)
    - Create `frontend/src/components/gamification/BadgeUnlockToast.tsx` — toast notification for new badge
    - Create `frontend/src/components/gamification/StreakIndicator.tsx` — flame icon with streak count
    - Create `frontend/src/components/gamification/ProgressBar.tsx` — gradient bar showing points to next level
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.2 Implement LeaderboardPage component
    - Create `frontend/src/pages/LeaderboardPage.tsx`
    - Fetch from GET /leaderboard
    - Display table: rank (medals for top 3), display name, level badge, points, badge count
    - Highlight current user's row
    - Show current user's rank if not in top 20
    - _Requirements: 9.5, 9.7_

  - [x] 9.3 Integrate gamification into triage flow
    - After session completes (status === 'complete'), fetch GET /auth/stats
    - Compare with previous stats to detect new points and badges
    - Show PointsAnimation overlay with points earned
    - Show BadgeUnlockToast for any newly earned badges
    - Update NavBar points/level display
    - _Requirements: 9.1, 9.2_

- [x] 10. Migrate existing triage page
  - [x] 10.1 Refactor existing App.tsx into TriagePage
    - Move current form/results logic from App.tsx into `frontend/src/pages/TriagePage.tsx`
    - Update App.tsx to be a shell with Router outlet and NavBar
    - Ensure TriagePage uses AuthContext for API calls (token included automatically)
    - Update useTriageSession hook to use new ApiClient with auth headers
    - Verify existing triage flow still works end-to-end
    - _Requirements: 1.1_

- [x] 11. Checkpoint — Verify full flow works
  - Build frontend (`cd frontend && npm run build`)
  - Build backend (`npx tsc -p backend/tsconfig.json`)
  - Verify CDK synth succeeds (`cd infra && npx cdk synth`)
  - Verify no TypeScript errors
  - Ask user to test: register → login → triage → see points → check history → view leaderboard → admin panel (if manager)

## Notes

- The frontend currently has NO router — App.tsx renders everything inline. Task 10.1 refactors this into a proper page structure.
- All new pages follow the existing dark glassmorphism design with Framer Motion animations.
- The gamification service runs synchronously within the pipeline Lambda after session completion (~100ms overhead).
- Badge criteria that require cross-session data (e.g., "10 salvageable parts across sessions") need a running counter stored on the user record, updated incrementally.
- The leaderboard scan is acceptable for <1000 users. For scale, add a GSI on points.
- Token persistence in localStorage is acceptable for this app's risk profile. For higher security, httpOnly cookies would be needed (requires backend changes).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "4.1", "10.1"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "6.1"] },
    { "id": 4, "tasks": ["7.2", "7.6"] },
    { "id": 5, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["11"] }
  ]
}
```
