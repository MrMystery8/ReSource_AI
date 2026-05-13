# Implementation Plan: ReSource AI E-Waste Triage

## Overview

This plan implements the ReSource AI e-waste triage system as a full-stack AWS application using CDK (TypeScript) for infrastructure, Lambda functions for backend compute, DynamoDB for session state, S3 for file storage, Amazon Bedrock for AI inference, and a React SPA frontend. Tasks are ordered for incremental development: infrastructure first, then backend core, then pipeline stages, then frontend, then testing.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - [x] 1.1 Initialize CDK project and define shared TypeScript interfaces
    - Create CDK app scaffold with `cdk init app --language typescript`
    - Create `shared/types.ts` with all data model interfaces (TriageSession, stage output types, error response format, pipeline stage configuration)
    - Create `shared/constants.ts` with PIPELINE_STAGES array, timeout values, and validation limits
    - Set up monorepo structure: `infra/`, `backend/`, `frontend/`, `shared/`
    - Configure TypeScript project references for shared types across packages
    - _Requirements: 14.1_

  - [x] 1.2 Set up testing framework
    - Install and configure Jest for unit tests across backend and shared packages
    - Install fast-check for property-based testing
    - Configure test scripts in package.json (`npm test`, `npm run test:integration`, `npm run test:infra`)
    - _Requirements: 14.1_

- [x] 2. Deploy core AWS infrastructure with CDK
  - [x] 2.1 Define DynamoDB table and S3 buckets
    - Create DynamoDB table `resource-ai-sessions` with partition key `sessionId` (String) and TTL attribute `expiresAt`
    - Create S3 bucket for file storage with: server-side encryption (AES-256), block all public access, lifecycle rule to delete objects after 24 hours, CORS configuration for frontend uploads
    - Create S3 bucket for frontend static hosting
    - _Requirements: 14.2, 15.3, 15.6_

  - [x] 2.2 Define API Gateway REST API with endpoints
    - Create REST API with three endpoints: POST /upload, POST /sessions, GET /sessions/{sessionId}
    - Configure API key authentication on all endpoints
    - Enforce HTTPS-only (disable HTTP)
    - Set appropriate integration timeouts (29 seconds for sync handlers)
    - Configure CORS headers for frontend origin
    - _Requirements: 13.1, 13.2, 13.3, 15.1, 15.4, 15.5_

  - [x] 2.3 Define Lambda functions and IAM roles
    - Create SubmitHandler Lambda (Node.js 20, 256 MB, 30s timeout)
    - Create PollHandler Lambda (Node.js 20, 256 MB, 30s timeout)
    - Create UploadHandler Lambda (Node.js 20, 512 MB, 30s timeout)
    - Create PipelineOrchestrator Lambda (Node.js 20, 1024 MB, 180s timeout)
    - Define IAM roles with least-privilege: DynamoDB read/write, S3 read/write, Bedrock InvokeModel, Lambda InvokeFunction (for async invocation)
    - No wildcard resource ARNs
    - _Requirements: 14.3, 14.4, 14.6_

  - [x] 2.4 Define CloudFront distribution and stack outputs
    - Create CloudFront distribution pointing to frontend S3 bucket with OAI
    - Output Backend API endpoint URL and Frontend CloudFront URL
    - _Requirements: 14.5, 14.7_

  - [ ]* 2.5 Write CDK snapshot tests
    - Verify synthesized CloudFormation matches expected resource configuration
    - Validate IAM policies have no wildcard resource ARNs
    - Validate S3 bucket has public access blocked and encryption enabled
    - Validate API Gateway is HTTPS-only with correct integration timeouts
    - _Requirements: 14.2, 14.6_

- [x] 3. Checkpoint - Ensure infrastructure deploys cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement backend core components
  - [x] 4.1 Implement InputSanitizer module
    - Create `backend/src/sanitizer.ts`
    - Strip/escape SQL metacharacters, HTML/script tags, and prompt injection sequences
    - Preserve semantic content of input while removing dangerous patterns
    - Enforce 5000-character maximum input length (reject with error if exceeded)
    - _Requirements: 15.7, 15.8_

  - [ ]* 4.2 Write property tests for InputSanitizer
    - **Property 14: Input sanitization removes injection patterns**
    - **Property 15: Input length enforcement**
    - **Validates: Requirements 15.7, 15.8**

  - [x] 4.3 Implement SessionStore module
    - Create `backend/src/session-store.ts`
    - Implement createSession: generate UUID v4, set status to 'processing', set TTL to 24 hours
    - Implement getSession: read by sessionId, return null if not found
    - Implement updateSessionStage: atomic update of a single stage output and currentStage
    - Implement markSessionComplete, markSessionFailed, markSessionTimeout
    - Retry DynamoDB writes up to 3 times with exponential backoff (100ms, 200ms, 400ms)
    - _Requirements: 3.6, 3.7, 13.2_

  - [x] 4.4 Implement FileStore module
    - Create `backend/src/file-store.ts`
    - Implement uploadFile: validate file size (max 10 MB) and type, store in S3 under `uploads/{sessionId}/{fileId}.{ext}`
    - Implement getFileUrl: generate pre-signed URL with 1-hour expiry
    - Implement storeGeneratedImage: store in `generated/{sessionId}/concept-visual.png`
    - _Requirements: 1.2, 1.3, 11.4_

  - [ ]* 4.5 Write property tests for file upload validation
    - **Property 2: File upload validation enforces size and count limits**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 4.6 Implement BedrockClient module
    - Create `backend/src/bedrock-client.ts`
    - Implement invokeTextModel: call Bedrock InvokeModel for text generation with 60-second timeout
    - Implement invokeImageModel: call Bedrock InvokeModel for image generation with 60-second timeout
    - Implement retry logic: retry once after 2-second delay on transient errors (throttling, service unavailable)
    - _Requirements: 14.3_

  - [x] 4.7 Implement request validation middleware
    - Create `backend/src/validator.ts`
    - Validate POST /sessions payload: require deviceIdentity, failureSymptoms, userContext (non-empty, non-whitespace, max 2000 chars each), optional fileIds array
    - Validate POST /upload: check file size and content type
    - Return 400 with field-specific error messages for validation failures
    - _Requirements: 2.5, 2.6, 13.6_

  - [ ]* 4.8 Write property tests for request validation
    - **Property 1: Input validation rejects whitespace-only and accepts non-whitespace**
    - **Property 18: Request schema validation**
    - **Validates: Requirements 2.5, 2.6, 13.6**

- [x] 5. Implement Lambda handlers
  - [x] 5.1 Implement SubmitHandler Lambda
    - Create `backend/src/handlers/submit.ts`
    - Validate request body using validator module
    - Sanitize text inputs using InputSanitizer
    - Create session in DynamoDB via SessionStore
    - Invoke PipelineOrchestrator Lambda asynchronously (InvocationType: 'Event')
    - Return 201 with `{ sessionId }`
    - Return 401 for missing/invalid API key (handled by API Gateway)
    - _Requirements: 3.6, 13.1, 15.1, 15.2_

  - [x] 5.2 Implement PollHandler Lambda
    - Create `backend/src/handlers/poll.ts`
    - Extract sessionId from path parameters
    - Query DynamoDB via SessionStore
    - Return 404 if session not found
    - Return 200 with session status, currentStage, error info, and all completed stage outputs
    - Generate pre-signed URLs for concept visual image if present
    - _Requirements: 3.7, 13.2, 13.4, 13.7_

  - [ ]* 5.3 Write property tests for poll response accuracy
    - **Property 20: Poll response accurately reflects session state**
    - **Property 17: API error responses include descriptive error body**
    - **Validates: Requirements 3.7, 13.4, 13.5, 13.7**

  - [x] 5.4 Implement UploadHandler Lambda
    - Create `backend/src/handlers/upload.ts`
    - Validate file size (max 10 MB) and content type against allowed formats
    - Check session file count (max 5 per session)
    - Store file via FileStore module
    - Return 201 with `{ fileId, fileName, contentType }`
    - Return 413 for oversized files, 400 for unsupported formats
    - Handle S3 unavailability gracefully (return error without failing session)
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 13.3_

  - [ ]* 5.5 Write property tests for authentication enforcement
    - **Property 16: Authentication enforcement**
    - **Validates: Requirements 15.1, 15.2**

- [x] 6. Checkpoint - Ensure backend core tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Pipeline Orchestrator and stages
  - [x] 7.1 Implement PipelineOrchestrator Lambda entry point
    - Create `backend/src/handlers/pipeline.ts`
    - Execute 8 stages sequentially with 120-second total timeout
    - Track elapsed time, abort if timeout exceeded
    - Update DynamoDB after each stage completes
    - On stage failure: halt execution, mark session as failed with stage name and error
    - On completion: mark session as complete
    - Handle image generation failure gracefully (mark complete with placeholder)
    - _Requirements: 3.1, 3.4, 3.5, 11.5_

  - [ ]* 7.2 Write property tests for pipeline orchestration
    - **Property 4: Pipeline failure halts subsequent stages**
    - **Validates: Requirements 3.4**

  - [x] 7.3 Implement PromptBuilder module
    - Create `backend/src/pipeline/prompt-builder.ts`
    - Build stage-specific prompts that include all user inputs plus accumulated prior stage outputs
    - Stage 1 receives only user inputs; each subsequent stage receives inputs + all prior outputs
    - Inject Safety Gate risk-level constraints into downstream stage prompts (Red: exclude internal components, Orange: flag as supervised)
    - _Requirements: 3.2, 3.3, 5.3_

  - [ ]* 7.4 Write property tests for accumulated context
    - **Property 3: Pipeline stages receive accumulated context**
    - **Property 6: Red risk restricts all downstream stages to external-only**
    - **Property 7: Orange risk flags internal components as supervised**
    - **Validates: Requirements 3.2, 3.3, 5.3, 6.3, 6.4, 7.3, 7.5**

  - [x] 7.5 Implement StageExecutor module
    - Create `backend/src/pipeline/stage-executor.ts`
    - Accept stage config, session data, and accumulated outputs
    - Call PromptBuilder to construct prompt
    - Call BedrockClient to invoke model
    - Parse and validate response structure per stage type
    - Return typed stage output
    - _Requirements: 3.1_

  - [x] 7.6 Implement Quick Verdict stage logic
    - Create `backend/src/pipeline/stages/quick-verdict.ts`
    - Define prompt template for Quick ReSource Verdict
    - Parse response into QuickVerdictOutput structure
    - Implement conservative risk escalation: if no files and any text field < 50 chars, escalate risk one tier
    - Validate confidence is one of: high, moderate, low
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 7.7 Write property tests for conservative risk escalation
    - **Property 19: Conservative risk escalation with insufficient evidence**
    - **Validates: Requirements 4.3**

  - [x] 7.8 Implement Safety Gate stage logic
    - Create `backend/src/pipeline/stages/safety-gate.ts`
    - Define prompt template for Safety Gate
    - Parse response into SafetyGateOutput structure
    - Validate riskLevel is one of Green/Yellow/Orange/Red; default to Red if missing or invalid
    - Validate at least 1 identified hazard
    - Default to next higher risk level when device condition info is incomplete
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ]* 7.9 Write property tests for Safety Gate validation
    - **Property 5: Safety Gate output validity and fallback**
    - **Validates: Requirements 5.1, 5.2, 5.5**

  - [x] 7.10 Implement Detailed Analysis stage logic
    - Create `backend/src/pipeline/stages/detailed-analysis.ts`
    - Define prompt template respecting risk-level constraints (Red: external only, Orange: flag supervised)
    - Parse response into DetailedAnalysisOutput structure
    - Validate word count ≤ 350, verdict summary ≤ 30 words
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.11 Implement Reusable Parts Map stage logic
    - Create `backend/src/pipeline/stages/reusable-parts-map.ts`
    - Define prompt template with risk-level constraints
    - Parse response into ReusablePartsMapOutput structure
    - Validate 6-10 rows, correct enum values for each column
    - Red: mark internal parts as "Do Not Access" with "Professional" skill
    - Orange: mark internal parts as "Conditional" with non-empty Safety Concern
    - Skill Needed must not exceed user's stated skill level for "Salvage" verdicts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.12 Implement Second Life Ideas stage logic
    - Create `backend/src/pipeline/stages/second-life-ideas.ts`
    - Define prompt template with risk-level and skill constraints
    - Parse response into SecondLifeIdeasOutput structure
    - Validate exactly 3 ideas, each ≤ 90 words
    - Red: only reference externally accessible components
    - Only reference components from Reusable Parts Map output
    - Default to beginner if no skill level stated
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 7.13 Write property tests for cross-stage consistency and constraints
    - **Property 8: Skill level constraint across stages**
    - **Property 9: Cross-stage component consistency**
    - **Property 10: Recommendations comply with Safety Gate handling tier**
    - **Validates: Requirements 7.4, 8.3, 8.4, 8.6, 9.3, 9.4**

  - [x] 7.14 Implement Next Steps stage logic
    - Create `backend/src/pipeline/stages/next-steps.ts`
    - Define prompt template with handling tier constraints per risk level
    - Parse response into NextStepsOutput structure
    - Validate word count ≤ 300
    - Green: allow external + simple internal; Yellow: cautious internal; Orange: supervised only; Red: external inspection only + professional referral
    - Include hazard warnings referencing Safety Gate hazard list
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 7.15 Write property tests for hazard warnings
    - **Property 11: Hazard warnings reference Safety Gate output**
    - **Validates: Requirements 9.5**

  - [x] 7.16 Implement Impact Card stage logic
    - Create `backend/src/pipeline/stages/impact-card.ts`
    - Define prompt template
    - Parse response into ImpactCardOutput structure
    - Validate total word count ≤ 120, each field ≤ 15 words
    - Red: exclude internal access recommendations, reflect professional recovery
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 7.17 Write property tests for output length constraints
    - **Property 12: Output length constraints**
    - **Validates: Requirements 6.2, 8.2, 9.2, 10.2, 10.3**

  - [x] 7.18 Implement Concept Visual stage logic
    - Create `backend/src/pipeline/stages/concept-visual.ts`
    - Build image generation prompt based on risk level: Green/Yellow/Orange → safest second-life project; Red → professional recovery concept
    - Call BedrockClient.invokeImageModel
    - Store generated image in S3 via FileStore
    - Return pre-signed URL with 1-hour expiry
    - Handle image generation failure: return placeholder, don't fail session
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 7.19 Write property tests for image concept risk alignment
    - **Property 13: Image concept reflects Safety Gate risk level**
    - **Validates: Requirements 11.2, 11.3**

- [x] 8. Checkpoint - Ensure pipeline tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement React frontend
  - [x] 9.1 Initialize React app and configure build
    - Create React app with Vite + TypeScript
    - Configure build output to `dist/` for S3 deployment
    - Import shared types from `shared/` package
    - Set up environment variables for API endpoint URL
    - _Requirements: 14.5_

  - [x] 9.2 Implement TriageForm component
    - Create form with 3 textarea inputs (Device Identity, Failure Symptoms, User Context)
    - Add placeholder hints demonstrating expected input format
    - Add live character counters showing current/2000 max
    - Validate required fields are non-empty and non-whitespace
    - Disable submit button when validation fails
    - Integrate FileUploader component
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 9.3 Implement FileUploader component
    - Create file input accepting allowed formats (.jpg, .jpeg, .png, .webp, .gif, .pdf, .docx, .pptx, .html, .csv, .json)
    - Validate file size client-side (max 10 MB)
    - Upload to POST /upload endpoint
    - Display upload status (uploading, success, error)
    - Indicate file upload is optional
    - Support up to 5 files per session
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 9.4 Implement PollingService and session submission
    - Create service to POST /sessions with form data
    - On 201 response, start polling GET /sessions/{sessionId} every 3 seconds
    - Stop polling when status is 'complete' or 'failed'
    - Handle network errors gracefully
    - _Requirements: 3.6, 3.7_

  - [x] 9.5 Implement ResultsView and stage display components
    - Create ResultsView container that renders stage results progressively
    - Create StageCard component for generic text stage output
    - Create PartsMapTable component rendering Reusable Parts Map as a table
    - Create ImpactCard component rendering the summary card
    - Create ConceptImage component rendering generated image (max 800px width)
    - Create RiskBadge component with color-coded Risk_Level indicator
    - Create ProgressIndicator showing current stage name during processing
    - Display error message for failed stages while preserving completed outputs
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 10. Checkpoint - Ensure frontend builds and renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integration wiring and end-to-end validation
  - [x] 11.1 Wire CDK stack to deploy Lambda code and frontend assets
    - Configure CDK to bundle Lambda handlers with esbuild
    - Configure CDK to deploy frontend build output to S3 bucket
    - Add CloudFront invalidation on frontend deploy
    - Verify all environment variables are passed to Lambda functions (table name, bucket name, Bedrock model IDs)
    - _Requirements: 14.1, 14.7_

  - [ ]* 11.2 Write integration tests for end-to-end flows
    - Test full triage submission → pipeline execution → poll for results
    - Test file upload → session creation referencing file → pipeline access to file
    - Test timeout behavior with mocked slow Bedrock responses
    - Test S3 failure resilience during upload
    - Test image generation failure results in completed session with placeholder
    - Test authentication rejection for requests without valid API key
    - _Requirements: 3.1, 3.4, 3.5, 1.6, 11.5, 15.1_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript throughout (CDK, Lambda handlers, shared types, React frontend)
- All Lambda functions use Node.js 20 runtime
- The pipeline orchestrator runs all 8 stages sequentially within a single Lambda invocation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "4.1", "4.3", "4.4", "4.6"] },
    { "id": 4, "tasks": ["4.2", "4.5", "4.7"] },
    { "id": 5, "tasks": ["4.8", "5.1", "5.2", "5.4"] },
    { "id": 6, "tasks": ["5.3", "5.5", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.5"] },
    { "id": 8, "tasks": ["7.4", "7.6", "7.8"] },
    { "id": 9, "tasks": ["7.7", "7.9", "7.10", "7.11"] },
    { "id": 10, "tasks": ["7.12", "7.14", "7.16", "7.18"] },
    { "id": 11, "tasks": ["7.13", "7.15", "7.17", "7.19"] },
    { "id": 12, "tasks": ["9.1"] },
    { "id": 13, "tasks": ["9.2", "9.3"] },
    { "id": 14, "tasks": ["9.4", "9.5"] },
    { "id": 15, "tasks": ["11.1"] },
    { "id": 16, "tasks": ["11.2"] }
  ]
}
```
