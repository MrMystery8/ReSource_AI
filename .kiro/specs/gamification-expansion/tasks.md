# Implementation Plan: Gamification Expansion

## Overview

This plan implements the gamification expansion in incremental steps: shared types and infrastructure first, then backend API handlers, then frontend components, and finally integration wiring. Each task builds on previous work to ensure no orphaned code. Property-based tests validate correctness properties from the design document using fast-check.

## Tasks

- [x] 1. Shared types, constants, and infrastructure setup
  - [x] 1.1 Add structured user context types and project data models to shared package
    - Add `StructuredUserContext`, `ExpertiseLevel`, `Motivation`, `MaterialAvailability`, `TimeCommitment` types to `shared/src/types.ts`
    - Add `Project`, `ProjectHistoryEntry`, `ImplementationGuide`, `InstructionStep`, `SubmissionResult`, `ProjectIdea` interfaces
    - Add `PROJECT_GRADE_POINTS`, `EXPERTISE_LEVEL_ORDER`, `IDEA_SKILL_TO_EXPERTISE` constants to `shared/src/constants.ts`
    - Update `TriageInputs.userContext` from `string` to `StructuredUserContext`
    - Export all new types from `shared/src/index.ts`
    - _Requirements: 2.6, 6.4, 6.5, 3.8_

  - [x] 1.2 Add Projects DynamoDB table and new API routes to CDK stack
    - Add Projects table with `projectId` partition key and `userId-index` GSI (partition: userId, sort: startedAt) in `infra/lib/resource-ai-stack.ts`
    - Add Lambda handlers for: POST /guide/generate, POST /guide/chat, POST /project/submit, GET /projects, PATCH /projects/:projectId
    - Grant new Lambdas access to Projects table, S3 bucket, and Bedrock
    - Pass PROJECTS_TABLE_NAME environment variable to relevant Lambdas
    - _Requirements: 4.2, 5.3, 6.3, 7.1_

- [x] 2. AI model upgrade and backend core services
  - [x] 2.1 Upgrade BedrockClient to Claude Sonnet 4.6
    - Change `DEFAULT_TEXT_MODEL` from `'apac.amazon.nova-pro-v1:0'` to the Claude Sonnet 4.6 model ID in `backend/src/bedrock-client.ts`
    - Update request body to Anthropic Messages API format: add `anthropic_version: "bedrock-2023-05-31"`, restructure `messages` array with `role: "user"` and `content` as string
    - Update response parsing from `parsed.output?.message?.content?.[0]?.text` to `parsed.content?.[0]?.text`
    - Keep `invokeImageModel` unchanged (Titan Image Generator)
    - Keep retry logic, timeout, and error handling unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 2.2 Write property test for Bedrock request payload schema
    - **Property 13: Bedrock request payload schema**
    - Test that for any prompt string, the constructed payload contains `anthropic_version`, `messages` array with user role, and inference params (max_tokens=4096, top_p=0.9, temperature=0.7)
    - **Validates: Requirements 8.2**

  - [ ]* 2.3 Write property test for Bedrock response parsing round-trip
    - **Property 14: Bedrock response parsing round-trip**
    - Test that valid Anthropic responses with text content blocks are correctly extracted, and invalid structures throw errors
    - **Validates: Requirements 8.3, 8.4**

  - [x] 2.4 Implement grade-to-points mapping utility
    - Create `backend/src/grading/grade-points.ts` with `gradeToPoints(grade: string): number` function using `PROJECT_GRADE_POINTS` lookup
    - Throw error for invalid grade values not in {A, B, C, D, F}
    - _Requirements: 6.4, 6.5_

  - [ ]* 2.5 Write property test for grade-to-points mapping
    - **Property 9: Grade-to-points mapping**
    - Test that A→500, B→350, C→200, D→100, F→25 for all valid grades, and invalid strings are rejected
    - **Validates: Requirements 6.4, 6.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend API handlers - Guide and Chat
  - [x] 4.1 Implement POST /guide/generate handler
    - Create `backend/src/handlers/guide-generate.ts`
    - Accept `GenerateGuideRequest` body (ideaTitle, ideaDescription, requiredComponents, additionalMaterials, userContext, sessionId)
    - Build prompt including all request fields and user expertise level for tailored instructions
    - Invoke Claude via BedrockClient, parse response into `ImplementationGuide` structure (materials, steps, estimatedTime, safetyWarnings)
    - Create Project record in DynamoDB with status 'in-progress' and cache generated guide
    - Return `GenerateGuideResponse` with the guide
    - Validate response bounds: 3-15 materials, 5-20 steps
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.2 Write property test for implementation guide content bounds
    - **Property 5: Implementation guide content bounds**
    - Test that for any valid guide response, materials list has 3-15 items and steps list has 5-20 items
    - **Validates: Requirements 4.3, 4.4**

  - [x] 4.3 Implement POST /guide/chat handler
    - Create `backend/src/handlers/guide-chat.ts`
    - Accept `ChatRequest` body (message max 500 chars, projectContext, conversationHistory max 50 messages)
    - Validate message length ≤ 500 characters, return 400 if exceeded
    - Build scoped prompt including project context (ideaTitle, materials, steps, deviceInfo) and conversation history
    - Invoke Claude via BedrockClient, return `ChatResponse` with reply
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [ ]* 4.4 Write property test for chatbot prompt scoping
    - **Property 6: Chatbot prompt scoping**
    - Test that for any user message and project context, the constructed prompt includes all project context fields (ideaTitle, materials, steps, deviceInfo)
    - **Validates: Requirements 5.3**

- [x] 5. Backend API handlers - Submission and History
  - [x] 5.1 Implement POST /project/submit handler
    - Create `backend/src/handlers/project-submit.ts`
    - Accept `SubmitProjectRequest` body (projectId, photoFileIds 2-6 items, guideContext)
    - Validate photo count (2-6), validate file types (JPEG, PNG, WebP) and sizes (≤5MB) via S3 head object
    - Build grading prompt with photo references and expected outcome from guideContext
    - Invoke Claude with multi-image payload for grading analysis
    - Parse grade (A-F) from response, calculate points via `gradeToPoints`
    - Update Project record: set status to 'completed', store submission result (grade, points, feedback, photoKeys, submittedAt)
    - Award points to user via gamification service
    - Handle resubmission: overwrite previous grade/points if project already graded
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 6.10_

  - [ ]* 5.2 Write property test for submission file validation
    - **Property 8: Submission file validation**
    - Test that files are accepted iff content type is JPEG/PNG/WebP AND size ≤ 5MB, and submissions accepted iff 2-6 photos
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 5.3 Write property test for resubmission overwrites previous result
    - **Property 11: Resubmission overwrites previous result**
    - Test that when a graded project receives a new submission, the stored grade and points are replaced with the new result
    - **Validates: Requirements 6.10**

  - [x] 5.4 Implement GET /projects handler
    - Create `backend/src/handlers/projects-list.ts`
    - Query Projects table by userId GSI with pagination (limit 10, offset parameter)
    - Return `ProjectsListResponse` with projects array, total count, limit, and offset
    - _Requirements: 7.1_

  - [x] 5.5 Implement PATCH /projects/:projectId handler
    - Create `backend/src/handlers/project-update.ts`
    - Accept `UpdateProjectRequest` body with action: 'abandon' or 'delete'
    - For 'abandon': validate project is 'in-progress', update status to 'abandoned'
    - For 'delete': permanently remove project record from DynamoDB
    - Return 400 for invalid transitions (e.g., abandoning a completed project)
    - _Requirements: 7.5, 7.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend - Points Animation fix and Structured Context Input
  - [x] 7.1 Fix PointsAnimation with safety timeout
    - Add `useEffect` in `frontend/src/components/gamification/PointsAnimation.tsx` that starts a 3-second `setTimeout` when `visible` becomes true
    - On timeout: force-hide the animation and call `onComplete` callback
    - Clear timeout on unmount or when `visible` changes to false
    - Ensure existing framer-motion animations, absolute positioning, pointer-events:none, and aria-live region remain intact
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 Create StructuredContextInput component
    - Create `frontend/src/components/StructuredContextInput.tsx`
    - Render expertise level as segmented button group (Beginner, Intermediate, Expert) with no pre-selection
    - Render motivation as chip-select (Learn Something New, Environmental Impact, Save Money, Creative Project) allowing exactly one selection
    - Render material availability as segmented button group (Basic Household Tools, Some Electronics Tools, Full Workshop) with no pre-selection
    - Render time commitment as dropdown (Under 1 Hour, 1-3 Hours, Half Day, Multi-Day Project) with placeholder and no default
    - Call `onChange` with partial context on each selection
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.3 Integrate StructuredContextInput into TriageForm
    - Replace the free-text User Context textarea in `frontend/src/components/TriageForm.tsx` with `StructuredContextInput`
    - Update form state to hold `StructuredUserContext` instead of string
    - Disable submit button until all four structured fields are selected
    - Update form submission to include structured context in payload (expertiseLevel, motivation, materialAvailability, timeCommitment)
    - Keep Device Identity and Failure Symptoms fields unchanged
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [ ]* 7.4 Write property test for form validation completeness
    - **Property 1: Form validation completeness**
    - Test that submit is enabled iff all four fields (expertiseLevel, motivation, materialAvailability, timeCommitment) are non-null
    - **Validates: Requirements 2.5**

  - [ ]* 7.5 Write property test for form payload serialization
    - **Property 2: Form payload serialization**
    - Test that for any valid structured context selections, the payload contains exactly the selected values with no free-text userContext field
    - **Validates: Requirements 2.6**

- [x] 8. Frontend - Enhanced Second Life Ideas
  - [x] 8.1 Create IdeaCard and SecondLifeIdeasSection components
    - Create `frontend/src/components/IdeaCard.tsx` as a clickable card displaying idea title, description, skill level, and required components
    - Create `frontend/src/components/SecondLifeIdeasSection.tsx` rendering 3 IdeaCards in responsive grid (1-col < 1024px, 3-col ≥ 1024px)
    - Add reload button with loading state and disabled state during request
    - Wire `onIdeaClick` to navigate to Implementation Guide page
    - Wire `onReload` to call API for fresh ideas
    - On reload failure/timeout: show error toast, retain previous cards
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 8.2 Update pipeline prompt builder for structured context
    - Modify `backend/src/pipeline/prompt-builder.ts` to include all four structured user context fields (expertiseLevel, motivation, materialAvailability, timeCommitment) in the secondLifeIdeas stage prompt
    - Ensure prompt instructs AI to tailor ideas to user's expertise and constraints
    - _Requirements: 3.1_

  - [x] 8.3 Implement skill-level filtering for Second Life Ideas
    - Add filtering logic in the frontend (or backend response processing) that only displays ideas whose skill level ≤ user's expertise level
    - Use `EXPERTISE_LEVEL_ORDER` and `IDEA_SKILL_TO_EXPERTISE` mappings from shared constants
    - Default to Beginner if no expertise level stated
    - _Requirements: 3.8_

  - [ ]* 8.4 Write property test for prompt includes structured user context
    - **Property 3: Prompt includes structured user context**
    - Test that for any structured user context, the built prompt string for secondLifeIdeas stage contains all four context values
    - **Validates: Requirements 3.1**

  - [ ]* 8.5 Write property test for skill level filtering
    - **Property 4: Skill level filtering**
    - Test that displayed ideas only include those whose skill level ≤ user's expertise (Beginner < Intermediate < Expert, with Advanced/Professional mapping to Expert)
    - **Validates: Requirements 3.8**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend - Implementation Guide page
  - [x] 10.1 Create ImplementationGuidePage component and route
    - Create `frontend/src/pages/ImplementationGuidePage.tsx`
    - Add route `/guide/:projectId` in `frontend/src/router.tsx`
    - On mount: call POST /guide/generate API with idea context and user context from route state or project lookup
    - Display skeleton loading state while API call is in progress
    - On success: render materials list, numbered steps (with explanations for Beginner), estimated time, and safety warnings
    - On failure: show error message with retry button
    - On timeout (30s): abort request, show timeout message with retry option
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 10.2 Create ProjectChatbot component
    - Create `frontend/src/components/ProjectChatbot.tsx`
    - Render toggle button (44x44px minimum touch target) in bottom-right corner
    - On toggle: open/close popup panel overlaying the guide page
    - Maintain conversation history in React state (max 50 messages)
    - On send: validate message ≤ 500 chars, show loading indicator, call POST /guide/chat with message, projectContext, and conversationHistory
    - On response: append assistant message to history
    - On error/timeout: show error message with retry option for last message
    - On navigation away: clear conversation history (useEffect cleanup)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 10.3 Write property test for conversation history cap
    - **Property 7: Conversation history cap**
    - Test that conversation history never exceeds 50 messages and oldest messages are discarded when cap is reached
    - **Validates: Requirements 5.6**

- [x] 11. Frontend - Project Submission
  - [x] 11.1 Create ProjectSubmission component
    - Create `frontend/src/components/ProjectSubmission.tsx`
    - Render photo upload area accepting JPEG, PNG, WebP (max 5MB per file)
    - Validate file type and size inline before upload, show error for invalid files
    - Require 2-6 photos: disable submit if count outside range, show count requirement message
    - On submit: upload photos to S3 via presigned URLs, then call POST /project/submit
    - Show loading indicator and disable submit during grading
    - On success: display grade, feedback, trigger PointsAnimation with awarded points
    - On failure: show error, allow retry (max 3 attempts tracked in component state)
    - If project already graded: allow resubmission, display replaces previous result
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ]* 11.2 Write property test for submission file validation (frontend)
    - **Property 8: Submission file validation**
    - Test that files accepted iff type is JPEG/PNG/WebP AND size ≤ 5MB, and submission accepted iff 2-6 photos
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 11.3 Write property test for submission retry limit
    - **Property 10: Submission retry limit**
    - Test that at most 3 retry attempts are allowed after initial failure, and no further automatic retries after exhaustion
    - **Validates: Requirements 6.8**

- [x] 12. Frontend - Project History
  - [x] 12.1 Create ProjectHistoryTab component and integrate into HistoryPage
    - Create `frontend/src/components/ProjectHistoryTab.tsx`
    - Render paginated list (10 per page) with load-more control
    - Each entry shows: idea title, date started, status indicator (In Progress / Completed / Abandoned)
    - Completed entries additionally show grade and points earned
    - Click in-progress → navigate to guide page; click completed → navigate to read-only guide view
    - Add "Abandon" action with confirmation dialog for in-progress projects
    - Add "Delete" action with permanent-deletion confirmation dialog
    - On API failure: show error with retry option
    - Update `frontend/src/pages/HistoryPage.tsx` to use tabbed layout: "Projects" tab and "Triage Sessions" tab
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 12.2 Write property test for project history entry completeness
    - **Property 12: Project history entry completeness**
    - Test that every project entry contains title, start date, and status; completed entries additionally contain grade and points
    - **Validates: Requirements 7.1, 7.8**

- [x] 13. Integration wiring and API service updates
  - [x] 13.1 Update frontend API service with new endpoints
    - Add functions to `frontend/src/services/api.ts`: `generateGuide()`, `sendChatMessage()`, `submitProject()`, `getProjects()`, `updateProject()`
    - Update existing `submitTriage()` to send structured user context instead of free-text
    - Add `reloadIdeas()` function for Second Life Ideas reload
    - _Requirements: 2.6, 3.4, 4.2, 5.3, 6.3, 7.1_

  - [x] 13.2 Wire ImplementationGuidePage with ProjectChatbot and ProjectSubmission
    - Integrate `ProjectChatbot` and `ProjectSubmission` components into `ImplementationGuidePage`
    - Pass project context to chatbot (ideaTitle, materials, steps, deviceInfo)
    - Pass guide context and projectId to submission component
    - Handle grading result: trigger PointsAnimation, update project status
    - _Requirements: 4.1, 5.1, 6.6_

  - [x] 13.3 Wire SecondLifeIdeasSection into results view
    - Replace or enhance existing Second Life Ideas display in `frontend/src/components/ResultsView.tsx` with `SecondLifeIdeasSection`
    - Connect reload button to API call using session context
    - Connect idea card clicks to navigation to `/guide/:projectId`
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The shared package must be built before backend/frontend can consume new types (`npm run build` in shared/)
- The CDK stack (task 1.2) must be deployed before new API endpoints are available for integration testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "7.1", "7.2"] },
    { "id": 3, "tasks": ["2.5", "7.3", "8.2"] },
    { "id": 4, "tasks": ["7.4", "7.5", "4.1", "4.3", "8.1", "8.3"] },
    { "id": 5, "tasks": ["4.2", "4.4", "8.4", "8.5", "5.1", "5.4", "5.5"] },
    { "id": 6, "tasks": ["5.2", "5.3", "10.1"] },
    { "id": 7, "tasks": ["10.2", "11.1", "12.1"] },
    { "id": 8, "tasks": ["10.3", "11.2", "11.3", "12.2", "13.1"] },
    { "id": 9, "tasks": ["13.2", "13.3"] }
  ]
}
```
