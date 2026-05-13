# Implementation Plan: User Profiles & JWT Authentication

## Overview

This plan adds JWT-based user authentication, user profiles, and role-based access control to ReSource AI. It builds on the existing CDK infrastructure, adding a users table, auth Lambda handlers, a Lambda Authorizer, and admin endpoints. Existing handlers are updated to scope sessions by userId.

## Tasks

- [x] 1. Add shared types and dependencies
  - [x] 1.1 Add user-related types to shared package
    - Add `User`, `UserProfile`, `JwtPayload` interfaces to `shared/src/types.ts`
    - Add `UserRole` type (`'user' | 'manager'`)
    - Add auth request/response types: `RegisterRequest`, `LoginRequest`, `LoginResponse`, `ProfileUpdateRequest`
    - Add admin response types: `UsersListResponse`, `SessionsListResponse`
    - _Requirements: 1, 2, 4, 5_

  - [x] 1.2 Add backend dependencies
    - Add `jsonwebtoken`, `bcryptjs` and their `@types/*` packages to backend/package.json
    - Add `uuid` if not already present (for userId generation)
    - Verify dependencies install cleanly
    - _Requirements: 7.5_

- [x] 2. Implement core auth modules
  - [x] 2.1 Implement PasswordService module
    - Create `backend/src/auth/password-service.ts`
    - Implement `hashPassword(plain: string): Promise<string>` using bcrypt with cost factor 10
    - Implement `verifyPassword(plain: string, hash: string): Promise<boolean>` using bcrypt.compare
    - _Requirements: 1.3, 2.2_

  - [x] 2.2 Implement JwtService module
    - Create `backend/src/auth/jwt-service.ts`
    - Implement `generateToken(payload: { userId, email, role }): string` — signs with HS256, 24h expiry
    - Implement `verifyToken(token: string): JwtPayload` — verifies signature and expiry, throws on invalid
    - Read JWT_SECRET from `process.env.JWT_SECRET`
    - _Requirements: 2.4, 2.5, 3.2, 3.3_

  - [x] 2.3 Implement UserStore module
    - Create `backend/src/auth/user-store.ts`
    - Implement `createUser(user: User): Promise<void>` — PutItem with condition that userId doesn't exist
    - Implement `getUserByEmail(email: string): Promise<User | null>` — Query GSI `email-index`
    - Implement `getUserById(userId: string): Promise<User | null>` — GetItem by PK
    - Implement `updateUser(userId: string, updates: Partial<User>): Promise<User>` — UpdateItem
    - Implement `listUsers(limit: number, offset: number): Promise<{ users: User[], total: number }>` — Scan with pagination
    - Normalize email to lowercase and trim before all operations
    - _Requirements: 1.4, 2.1, 4, 5.2_

- [x] 3. Implement Lambda handlers
  - [x] 3.1 Implement Auth handler (register + login + profile)
    - Create `backend/src/handlers/auth.ts`
    - Route based on HTTP method + path: POST /auth/register, POST /auth/login, GET /auth/profile, PUT /auth/profile
    - **Register**: validate inputs → check email uniqueness → hash password → create user → generate JWT → return 201
    - **Login**: validate inputs → get user by email → verify password → generate JWT → return 200
    - **Profile GET**: extract userId from authorizer context → get user → return profile
    - **Profile PUT**: extract userId → validate displayName → update user → return profile
    - Never include passwordHash in responses
    - _Requirements: 1, 2, 4_

  - [x] 3.2 Implement Lambda Authorizer
    - Create `backend/src/handlers/authorizer.ts`
    - Extract token from `Authorization: Bearer <token>` header
    - Verify token using JwtService
    - Return IAM Allow policy with userId, email, role in context on success
    - Throw 'Unauthorized' error on failure (API Gateway returns 401)
    - _Requirements: 3_

  - [x] 3.3 Implement Admin handler
    - Create `backend/src/handlers/admin.ts`
    - Route based on HTTP method + path: GET /admin/users, PUT /admin/users/{userId}/role, GET /admin/sessions
    - Check role === 'manager' from authorizer context, return 403 if not
    - **List users**: paginated scan of users table
    - **Update role**: validate role value → update user → return updated profile
    - **List sessions**: paginated scan/query of sessions table (optional userId filter via GSI)
    - _Requirements: 5_

  - [x] 3.4 Update existing handlers for userId context
    - **SubmitHandler**: extract userId from `event.requestContext.authorizer.userId`, store in session record
    - **PollHandler**: extract userId, verify session ownership (userId match OR role === 'manager'), return 403 if denied
    - **UploadHandler**: extract userId from context (for audit trail, no behavior change)
    - _Requirements: 6_

- [x] 4. Update CDK infrastructure
  - [x] 4.1 Add Users DynamoDB table
    - Create `resource-ai-users` table with PK `userId` (String)
    - Add GSI `email-index` with PK `email` (String)
    - PAY_PER_REQUEST billing, DESTROY removal policy
    - _Requirements: 7.1_

  - [x] 4.2 Add userId GSI to Sessions table
    - Add GSI `userId-index` with PK `userId` (String) and SK `createdAt` (String)
    - _Requirements: 6.2_

  - [x] 4.3 Deploy Auth handler Lambda
    - Create NodejsFunction for auth handler (256 MB, 30s timeout)
    - Environment: TABLE_NAME (users table), JWT_SECRET (from CDK context or hardcoded default for dev)
    - Grant: DynamoDB read/write on users table
    - _Requirements: 7.2, 7.4_

  - [x] 4.4 Deploy Lambda Authorizer
    - Create NodejsFunction for authorizer (128 MB, 10s timeout)
    - Environment: JWT_SECRET
    - Create `apigateway.TokenAuthorizer` referencing the Lambda
    - Configure result caching (TTL 300 seconds)
    - _Requirements: 7.3, 7.4_

  - [x] 4.5 Deploy Admin handler Lambda
    - Create NodejsFunction for admin handler (256 MB, 30s timeout)
    - Environment: USERS_TABLE_NAME, SESSIONS_TABLE_NAME
    - Grant: DynamoDB read on users table, read on sessions table, write on users table (for role updates)
    - _Requirements: 7.2_

  - [x] 4.6 Wire API Gateway routes
    - Add `/auth` resource with `/auth/register` (POST), `/auth/login` (POST), `/auth/profile` (GET, PUT)
    - Add `/admin` resource with `/admin/users` (GET), `/admin/users/{userId}` with `/role` (PUT), `/admin/sessions` (GET)
    - Auth endpoints: API key required, NO authorizer
    - Profile + admin + existing endpoints: API key required + Lambda Authorizer
    - Update existing `/sessions` and `/upload` endpoints to use the Lambda Authorizer
    - _Requirements: 3.5, 3.6, 7.2_

  - [x] 4.7 Update existing Lambda environment variables
    - Add USERS_TABLE_NAME to submit/poll handlers (for future use)
    - Ensure JWT_SECRET is consistent across auth handler, authorizer, and any handler that needs it
    - _Requirements: 7.6_

- [x] 5. Checkpoint — Verify auth flow works end-to-end
  - Build backend (`npx tsc -p backend/tsconfig.json`)
  - Verify CDK synth succeeds (`npx cdk synth`)
  - Verify no TypeScript errors across the project
  - Ask user to test register → login → access protected endpoint flow after deploy

## Notes

- The JWT_SECRET should be a strong random string (32+ characters). For local dev/testing, a default is acceptable. For production, pass via `cdk deploy --context jwtSecret=<value>` or SSM.
- The Lambda Authorizer caches results for 5 minutes per token, reducing invocations significantly.
- bcrypt with cost 10 adds ~100ms to register/login — acceptable for Lambda but noticeable in cold starts.
- Pagination uses scan (not ideal for large datasets) but acceptable for the expected user count in this app.
- The existing API key remains as a first gate — this prevents unauthenticated traffic from even reaching the authorizer.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["4.6", "4.7"] },
    { "id": 5, "tasks": ["5"] }
  ]
}
```
