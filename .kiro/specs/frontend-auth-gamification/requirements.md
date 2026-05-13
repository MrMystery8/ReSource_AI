# Requirements Document

## Introduction

This feature adds frontend UI for user authentication (login/register), user profile management, session history, an admin panel for managers, and a gamification system (points, badges, levels, streaks) to motivate users to recycle more e-waste. It builds on the already-implemented backend auth endpoints, admin endpoints, and session ownership. The gamification backend (points table, award logic) is also included as it's tightly coupled to the frontend experience.

## Glossary

- **Auth Context**: React context providing current user state (logged in/out, profile, token) to all components
- **Protected Route**: A frontend route that redirects to login if the user is not authenticated
- **Session History**: A chronological list of a user's past triage sessions with summary data
- **Points**: Numeric reward earned by completing triage sessions and achieving milestones
- **Badge**: A named achievement unlocked by meeting specific criteria (e.g., first triage, 10 sessions)
- **Level**: A tier derived from total points (Recycler → Salvager → E-Waste Champion → Green Guardian)
- **Streak**: Consecutive days/weeks with at least one triage submission
- **Leaderboard**: A ranked list of users by points (opt-in, visible to all authenticated users)
- **Admin Panel**: A manager-only interface for viewing all users, changing roles, and viewing all sessions

## Requirements

### Requirement 1: Frontend Routing and Navigation

**User Story:** As a user, I want to navigate between different pages of the app, so that I can access login, triage, history, profile, and leaderboard features.

#### Acceptance Criteria

1. THE Frontend SHALL use React Router (react-router-dom) for client-side routing with the following routes: `/login`, `/register`, `/` (triage form), `/history`, `/profile`, `/leaderboard`, `/admin` (manager only)
2. THE Frontend SHALL display a persistent navigation bar showing: app logo/name, links to Triage, History, Leaderboard, and either Login/Register (if unauthenticated) or Profile dropdown + Logout (if authenticated)
3. THE Frontend SHALL redirect unauthenticated users to `/login` when they attempt to access any protected route (all routes except `/login` and `/register`)
4. THE Frontend SHALL preserve the intended destination URL and redirect back to it after successful login
5. THE Frontend SHALL display the user's current level badge and points total in the navigation bar when authenticated

### Requirement 2: User Registration Page

**User Story:** As a new user, I want to create an account through a registration form, so that I can start using the app and track my recycling progress.

#### Acceptance Criteria

1. THE Frontend SHALL display a registration form at `/register` with fields: email, password, confirm password, and display name
2. THE Frontend SHALL validate that email is well-formed, password is at least 8 characters, confirm password matches password, and display name is non-empty (max 100 chars)
3. THE Frontend SHALL display inline validation errors below each field as the user types (debounced)
4. THE Frontend SHALL call POST /auth/register on submission and store the returned JWT token and user profile in auth context
5. THE Frontend SHALL display server-side errors (e.g., "Email already registered") in a toast or alert
6. THE Frontend SHALL redirect to the triage page (`/`) on successful registration
7. THE Frontend SHALL provide a link to the login page for existing users

### Requirement 3: User Login Page

**User Story:** As a returning user, I want to log in with my email and password, so that I can access my account and history.

#### Acceptance Criteria

1. THE Frontend SHALL display a login form at `/login` with fields: email and password
2. THE Frontend SHALL validate that email is non-empty and password is non-empty before enabling the submit button
3. THE Frontend SHALL call POST /auth/login on submission and store the returned JWT token and user profile in auth context
4. THE Frontend SHALL display "Invalid credentials" error on 401 response without revealing which field is wrong
5. THE Frontend SHALL redirect to the originally intended page (or `/` if none) on successful login
6. THE Frontend SHALL provide a link to the registration page for new users
7. THE Frontend SHALL persist the JWT token in localStorage so the user remains logged in across page refreshes

### Requirement 4: Auth Context and Token Management

**User Story:** As a developer, I want centralized auth state management, so that all components can access the current user and token consistently.

#### Acceptance Criteria

1. THE Frontend SHALL provide an AuthContext (React Context) exposing: user (UserProfile | null), token (string | null), isAuthenticated (boolean), login function, register function, logout function, and loading state
2. THE Frontend SHALL include the JWT token in the Authorization header (Bearer scheme) for all API requests to protected endpoints
3. THE Frontend SHALL include both the API key (x-api-key) and JWT token (Authorization: Bearer) in requests to protected endpoints
4. THE Frontend SHALL clear the token and user from state and localStorage on logout, then redirect to `/login`
5. THE Frontend SHALL check token expiry on app load and redirect to `/login` if the token is expired
6. THE Frontend SHALL handle 401 responses from any API call by clearing auth state and redirecting to `/login`

### Requirement 5: User Profile Page

**User Story:** As a user, I want to view and edit my profile, so that I can update my display name and see my account details.

#### Acceptance Criteria

1. THE Frontend SHALL display a profile page at `/profile` showing: display name (editable), email (read-only), role, member since date, current level, total points, current streak, and badges earned
2. THE Frontend SHALL allow editing the display name inline with a save button, calling PUT /auth/profile
3. THE Frontend SHALL display a success toast on profile update and an error toast on failure
4. THE Frontend SHALL display the user's gamification stats (points, level, streak, badges) in a visually appealing card layout

### Requirement 6: Session History Page

**User Story:** As a user, I want to view my past triage sessions, so that I can review previous results and track my recycling activity.

#### Acceptance Criteria

1. THE Frontend SHALL display a history page at `/history` showing a list of the user's past triage sessions
2. EACH session entry SHALL display: device name (from quickVerdict.deviceIdentification), risk level badge, salvage score, date submitted, and status (complete/failed/processing)
3. THE Frontend SHALL fetch sessions from GET /sessions (new endpoint needed) or use the admin endpoint filtered by userId for the current user
4. THE Frontend SHALL support pagination (load more / infinite scroll) for users with many sessions
5. WHEN a user clicks on a history entry, THE Frontend SHALL navigate to a detail view showing the full triage results for that session
6. THE Frontend SHALL display an empty state with a call-to-action to start a new triage if the user has no history

### Requirement 7: Admin Panel

**User Story:** As a manager, I want an admin panel to view all users and sessions, so that I can oversee system usage and manage roles.

#### Acceptance Criteria

1. THE Frontend SHALL display an admin panel at `/admin` accessible only to users with the "manager" role
2. IF a non-manager user navigates to `/admin`, THE Frontend SHALL redirect them to `/` with an "Access denied" toast
3. THE Admin Panel SHALL have two tabs: "Users" and "Sessions"
4. THE Users tab SHALL display a paginated table of all users (display name, email, role, joined date) fetched from GET /admin/users
5. THE Users tab SHALL allow managers to change a user's role via a dropdown, calling PUT /admin/users/{userId}/role
6. THE Sessions tab SHALL display a paginated table of all sessions (session ID, user email, device name, risk level, status, date) fetched from GET /admin/sessions
7. THE Admin Panel SHALL support filtering sessions by userId

### Requirement 8: Gamification Backend — Points and Badges

**User Story:** As a user, I want to earn points and badges for recycling activities, so that I feel motivated to recycle more e-waste.

#### Acceptance Criteria

1. THE Backend SHALL maintain a points balance and badge list for each user in the users DynamoDB table (new attributes: points, level, streak, badges, lastTriageDate)
2. THE Backend SHALL award points when a triage session completes: base 100 points per completed session, +25 bonus if photos were uploaded, +50 bonus for "Green" risk level outcome, +25 for detailed input (all fields > 200 chars)
3. THE Backend SHALL calculate the user's level based on total points: Recycler (0-499), Salvager (500-1499), E-Waste Champion (1500-3999), Green Guardian (4000+)
4. THE Backend SHALL track streaks: increment streak counter if the user's last triage was within the past 7 days, reset to 1 if more than 7 days have passed
5. THE Backend SHALL award badges based on milestones: "First Triage" (1 session), "Regular Recycler" (5 sessions), "Hazard Spotter" (submitted a Red-risk device), "Parts Hunter" (10+ salvageable parts found across sessions), "Streak Master" (4-week streak), "Green Champion" (5 Green-risk outcomes)
6. THE Backend SHALL expose a GET /auth/stats endpoint returning the user's points, level, streak, badges, and session count
7. THE Backend SHALL update points and check badge criteria immediately after each pipeline completion (in the pipeline orchestrator or via a post-completion hook)

### Requirement 9: Gamification Frontend — Display and Motivation

**User Story:** As a user, I want to see my progress, achievements, and how I compare to others, so that I'm motivated to keep recycling.

#### Acceptance Criteria

1. THE Frontend SHALL display a points animation ("+100 points!") after a triage session completes successfully
2. THE Frontend SHALL display a badge unlock notification (toast with badge icon and name) when a new badge is earned
3. THE Frontend SHALL display the user's level with a progress bar showing points toward the next level on the profile page
4. THE Frontend SHALL display earned badges as icons/cards on the profile page, with unearned badges shown as greyed-out silhouettes
5. THE Frontend SHALL display a leaderboard page at `/leaderboard` showing the top 20 users by points (display name, level, points, badge count)
6. THE Backend SHALL expose a GET /leaderboard endpoint returning the top users ranked by points (accessible to all authenticated users)
7. THE Frontend SHALL highlight the current user's position on the leaderboard

### Requirement 10: Backend Endpoint Additions

**User Story:** As a developer, I want the necessary backend endpoints to support history and gamification features.

#### Acceptance Criteria

1. THE Backend SHALL expose a GET /sessions endpoint (protected) that returns the authenticated user's sessions, paginated, sorted by createdAt descending
2. THE Backend SHALL expose a GET /auth/stats endpoint (protected) returning: points, level, streak, badges array, totalSessions, lastTriageDate
3. THE Backend SHALL expose a GET /leaderboard endpoint (protected) returning top 20 users by points with fields: displayName, level, points, badgeCount
4. THE Backend SHALL update the pipeline orchestrator to call a gamification service on session completion that awards points, updates streak, and checks badge criteria
5. THE Backend SHALL add gamification fields to the User type: points (number, default 0), level (string), streak (number, default 0), badges (string array, default []), lastTriageDate (string | null), totalSessions (number, default 0)
