# Requirements Document

## Introduction

This feature adds user authentication (email/password with JWT), user profiles, and role-based access control to ReSource AI. It replaces the current API-key-only authentication with a proper user identity layer, enabling per-user session ownership, manager oversight, and a foundation for future features like history and gamification.

## Glossary

- **User**: A registered individual with an email, password, and profile in the system
- **JWT**: JSON Web Token — a signed, stateless token issued on login and validated on each request
- **Role**: A user's access level — either "user" (standard) or "manager" (elevated privileges)
- **Lambda Authorizer**: An API Gateway component that validates JWTs before requests reach handlers
- **Password Hash**: A bcrypt-hashed representation of the user's password stored in DynamoDB

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to create an account with my email and password, so that I can access the system and have my triage sessions associated with my identity.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a POST /auth/register endpoint that accepts email, password, and displayName fields
2. THE Backend_API SHALL validate that email is a well-formed email address, password is at least 8 characters, and displayName is non-empty and at most 100 characters
3. THE Backend_API SHALL hash the password using bcrypt with a cost factor of 10 before storing
4. THE Backend_API SHALL reject registration if the email is already associated with an existing account, returning 409 Conflict
5. THE Backend_API SHALL assign the "user" role by default to all new registrations
6. THE Backend_API SHALL return 201 with a JWT token and user profile (excluding passwordHash) on successful registration
7. THE Backend_API SHALL NOT require authentication to access the register endpoint

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can receive a token to access protected resources.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a POST /auth/login endpoint that accepts email and password fields
2. THE Backend_API SHALL validate the provided password against the stored bcrypt hash
3. IF the email does not exist or the password does not match, THEN THE Backend_API SHALL return 401 Unauthorized with a generic "Invalid credentials" message (not revealing which field is wrong)
4. THE Backend_API SHALL return 200 with a JWT token and user profile (excluding passwordHash) on successful login
5. THE JWT SHALL contain the userId, email, role, and an expiration time of 24 hours
6. THE Backend_API SHALL NOT require authentication to access the login endpoint

### Requirement 3: JWT Validation and Lambda Authorizer

**User Story:** As a developer, I want all protected API endpoints to validate JWT tokens, so that only authenticated users can access the system.

#### Acceptance Criteria

1. THE Infrastructure SHALL deploy a Lambda Authorizer function that validates JWT tokens from the Authorization header (Bearer scheme)
2. THE Lambda Authorizer SHALL verify the JWT signature using a shared secret stored in an environment variable
3. THE Lambda Authorizer SHALL reject tokens that are expired, malformed, or have an invalid signature, returning 401
4. THE Lambda Authorizer SHALL extract userId, email, and role from valid tokens and pass them to downstream handlers via the request context
5. THE API Gateway SHALL attach the Lambda Authorizer to all endpoints EXCEPT POST /auth/register and POST /auth/login
6. THE existing API key authentication SHALL remain as an additional layer (both API key AND JWT required for protected endpoints)

### Requirement 4: User Profile Management

**User Story:** As a user, I want to view and update my profile, so that I can manage my display name and see my account details.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a GET /auth/profile endpoint that returns the authenticated user's profile (userId, email, displayName, role, createdAt)
2. THE Backend_API SHALL expose a PUT /auth/profile endpoint that allows updating displayName (max 100 characters, non-empty)
3. THE Backend_API SHALL NOT allow users to change their email, role, or password through the profile endpoint
4. THE Backend_API SHALL return 401 if the request lacks a valid JWT

### Requirement 5: Role-Based Access Control

**User Story:** As a manager, I want elevated access to view all users and their sessions, so that I can oversee system usage and support users.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a GET /admin/users endpoint accessible only to users with the "manager" role
2. THE GET /admin/users endpoint SHALL return a list of all user profiles (excluding passwordHash) with pagination (limit/offset query params, default limit 50)
3. THE Backend_API SHALL expose a PUT /admin/users/{userId}/role endpoint accessible only to managers, allowing role changes between "user" and "manager"
4. IF a non-manager user attempts to access an admin endpoint, THEN THE Backend_API SHALL return 403 Forbidden
5. THE Backend_API SHALL expose a GET /admin/sessions endpoint accessible only to managers, returning all triage sessions across all users with pagination

### Requirement 6: Session Ownership

**User Story:** As a user, I want my triage sessions to be associated with my account, so that I can later view my history.

#### Acceptance Criteria

1. WHEN a user creates a new triage session (POST /sessions), THE Backend_API SHALL associate the session with the authenticated user's userId
2. THE sessions DynamoDB table SHALL include a userId attribute and a Global Secondary Index (GSI) on userId for efficient per-user queries
3. THE GET /sessions/{sessionId} endpoint SHALL only return sessions owned by the authenticated user (or any session if the user is a manager)
4. IF a user attempts to access a session they do not own, THEN THE Backend_API SHALL return 403 Forbidden

### Requirement 7: Infrastructure Changes

**User Story:** As a developer, I want the infrastructure updated to support user authentication, so that the new auth components are deployed alongside existing resources.

#### Acceptance Criteria

1. THE Infrastructure SHALL provision a new DynamoDB table "resource-ai-users" with partition key userId (String) and a GSI on email for login lookups
2. THE Infrastructure SHALL deploy auth handler Lambda functions (register, login) with access to the users table
3. THE Infrastructure SHALL deploy a Lambda Authorizer function with access to the JWT secret
4. THE Infrastructure SHALL store the JWT signing secret as a Lambda environment variable (sourced from CDK context or SSM Parameter Store)
5. THE Infrastructure SHALL add the jsonwebtoken and bcryptjs dependencies to the backend Lambda bundle
6. THE Infrastructure SHALL update existing Lambda handlers to receive userId from the authorizer context
