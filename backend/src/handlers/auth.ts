import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  type AuthenticationResultType,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  User,
  UserProfile,
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  ProfileUpdateRequest,
  ErrorResponse,
  UserStatsResponse,
  BadgeInfo,
  UserLevel,
  BADGE_DEFINITIONS,
  LEVEL_THRESHOLDS,
} from '@resource-ai/shared';
import { hashPassword, verifyPassword } from '../auth/password-service';
import { generateToken } from '../auth/jwt-service';
import { UserStore } from '../auth/user-store';
import { resolveAuthenticatedUserId } from '../auth/request-identity';

const userStore = new UserStore();
const AUTH_MODE = (process.env.AUTH_MODE ?? 'legacy').toLowerCase();
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const cognitoClient = new CognitoIdentityProviderClient({});

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

// --- Validation helpers ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'Invalid email format';
  }
  return null;
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

function validateDisplayName(displayName: unknown): string | null {
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return 'Display name is required';
  }
  if (displayName.trim().length > 100) {
    return 'Display name must be at most 100 characters';
  }
  return null;
}

function isCognitoAuthMode(): boolean {
  return AUTH_MODE === 'cognito';
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT format');
  }
  const payloadPart = parts[1];
  const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const json = Buffer.from(normalized, 'base64').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

function userProfileFromCognitoIdToken(idToken: string): UserProfile {
  const claims = decodeJwtPayload(idToken);
  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  const email = typeof claims.email === 'string' ? claims.email : '';
  const displayNameRaw =
    (typeof claims.name === 'string' && claims.name) ||
    (typeof claims['cognito:username'] === 'string' && claims['cognito:username']) ||
    email ||
    'User';

  return {
    userId: sub || email || uuidv4(),
    email: email || `${sub || 'user'}@users.local`,
    displayName: displayNameRaw,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
}

async function initiateCognitoPasswordAuth(
  email: string,
  password: string
): Promise<AuthenticationResultType> {
  if (!COGNITO_APP_CLIENT_ID) {
    throw new Error('COGNITO_APP_CLIENT_ID is not configured');
  }

  const result = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_APP_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  if (!result.AuthenticationResult) {
    throw new Error(result.ChallengeName ? `Challenge required: ${result.ChallengeName}` : 'Authentication failed');
  }

  return result.AuthenticationResult;
}

// --- Response helpers ---

function toUserProfile(user: User): UserProfile {
  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function errorResponse(statusCode: number, error: ErrorResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(error),
  };
}

function successResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body),
  };
}

// --- Route handlers ---

async function handleRegister(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Parse body
  let body: RegisterRequest;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  // Validate inputs
  const emailError = validateEmail(body.email);
  if (emailError) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: emailError, field: 'email' },
    });
  }

  const passwordError = validatePassword(body.password);
  if (passwordError) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: passwordError, field: 'password' },
    });
  }

  const displayNameError = validateDisplayName(body.displayName);
  if (displayNameError) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: displayNameError, field: 'displayName' },
    });
  }

  // Cognito mode: register in Cognito and return Cognito token
  if (isCognitoAuthMode()) {
    if (!COGNITO_APP_CLIENT_ID) {
      return errorResponse(500, {
        error: { code: 'INTERNAL_ERROR', message: 'Cognito app client is not configured' },
      });
    }

    const normalizedEmail = body.email.trim().toLowerCase();

    try {
      await cognitoClient.send(
        new SignUpCommand({
          ClientId: COGNITO_APP_CLIENT_ID,
          Username: normalizedEmail,
          Password: body.password,
          UserAttributes: [
            { Name: 'email', Value: normalizedEmail },
            { Name: 'name', Value: body.displayName.trim() },
          ],
        })
      );

      const authResult = await initiateCognitoPasswordAuth(normalizedEmail, body.password);
      const idToken = authResult.IdToken;
      if (!idToken) {
        return errorResponse(500, {
          error: { code: 'INTERNAL_ERROR', message: 'Cognito did not return an ID token' },
        });
      }

      const response: LoginResponse = {
        token: idToken,
        user: userProfileFromCognitoIdToken(idToken),
      };
      return successResponse(201, response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to register with Cognito';

      if (message.includes('UsernameExistsException')) {
        return errorResponse(409, {
          error: { code: 'CONFLICT', message: 'Email already registered' },
        });
      }

      if (message.includes('UserNotConfirmedException')) {
        return errorResponse(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Account created. Please confirm your email, then sign in.',
          },
        });
      }

      return errorResponse(400, {
        error: { code: 'VALIDATION_ERROR', message },
      });
    }
  }

  // Legacy mode: local user registration
  // Check email uniqueness
  const normalizedEmail = body.email.trim().toLowerCase();
  const existingUser = await userStore.getUserByEmail(normalizedEmail);
  if (existingUser) {
    return errorResponse(409, {
      error: { code: 'CONFLICT', message: 'Email already registered' },
    });
  }

  // Hash password and create user
  const passwordHash = await hashPassword(body.password);
  const now = new Date().toISOString();
  const user: User = {
    userId: uuidv4(),
    email: normalizedEmail,
    passwordHash,
    displayName: body.displayName.trim(),
    role: 'user',
    createdAt: now,
    updatedAt: now,
  };

  await userStore.createUser(user);

  // Generate JWT
  const token = generateToken({ userId: user.userId, email: user.email, role: user.role });

  const response: LoginResponse = {
    token,
    user: toUserProfile(user),
  };

  return successResponse(201, response);
}

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Parse body
  let body: LoginRequest;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  // Validate inputs
  const emailError = validateEmail(body.email);
  if (emailError) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: emailError, field: 'email' },
    });
  }

  const passwordError = validatePassword(body.password);
  if (passwordError) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: passwordError, field: 'password' },
    });
  }

  // Cognito mode: authenticate with Cognito and return Cognito token
  if (isCognitoAuthMode()) {
    const normalizedEmail = body.email.trim().toLowerCase();
    try {
      const authResult = await initiateCognitoPasswordAuth(normalizedEmail, body.password);
      const idToken = authResult.IdToken;
      if (!idToken) {
        return errorResponse(500, {
          error: { code: 'INTERNAL_ERROR', message: 'Cognito did not return an ID token' },
        });
      }

      const response: LoginResponse = {
        token: idToken,
        user: userProfileFromCognitoIdToken(idToken),
      };
      return successResponse(200, response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      return errorResponse(401, {
        error: { code: 'AUTH_FAILURE', message: message.includes('Challenge required') ? message : 'Invalid credentials' },
      });
    }
  }

  // Legacy mode: local user/password
  // Get user by email
  const user = await userStore.getUserByEmail(body.email.trim().toLowerCase());
  if (!user) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Invalid credentials' },
    });
  }

  // Verify password
  if (!user.passwordHash) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Invalid credentials' },
    });
  }

  const passwordValid = await verifyPassword(body.password, user.passwordHash);
  if (!passwordValid) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Invalid credentials' },
    });
  }

  // Generate JWT
  const token = generateToken({ userId: user.userId, email: user.email, role: user.role });

  const response: LoginResponse = {
    token,
    user: toUserProfile(user),
  };

  return successResponse(200, response);
}

async function handleGetProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await resolveAuthenticatedUserId(event, userStore);
  if (!userId) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Unauthorized' },
    });
  }

  const user = await userStore.getUserById(userId);
  if (!user) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Unauthorized' },
    });
  }

  return successResponse(200, toUserProfile(user));
}

async function handleUpdateProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await resolveAuthenticatedUserId(event, userStore);
  if (!userId) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Unauthorized' },
    });
  }

  // Parse body
  let body: ProfileUpdateRequest;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  // Validate displayName
  const displayNameError = validateDisplayName(body.displayName);
  if (displayNameError) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: displayNameError, field: 'displayName' },
    });
  }

  // Update user
  const updatedUser = await userStore.updateUser(userId, {
    displayName: body.displayName.trim(),
  });

  return successResponse(200, toUserProfile(updatedUser));
}

async function handleGetStats(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await resolveAuthenticatedUserId(event, userStore);
  if (!userId) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Unauthorized' },
    });
  }

  const user = await userStore.getUserById(userId);
  if (!user) {
    return errorResponse(401, {
      error: { code: 'AUTH_FAILURE', message: 'Unauthorized' },
    });
  }

  // Extract gamification fields with defaults
  const userRecord = user as User & {
    points?: number;
    level?: UserLevel;
    streak?: number;
    badges?: string[];
    totalSessions?: number;
    lastTriageDate?: string | null;
  };

  const points = userRecord.points ?? 0;
  const level = userRecord.level ?? 'Recycler';
  const streak = userRecord.streak ?? 0;
  const userBadgeIds = userRecord.badges ?? [];
  const totalSessions = userRecord.totalSessions ?? 0;
  const lastTriageDate = userRecord.lastTriageDate ?? null;

  // Map badge IDs to full BadgeInfo objects
  const badges: BadgeInfo[] = BADGE_DEFINITIONS.map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    earnedAt: userBadgeIds.includes(badge.id) ? (lastTriageDate ?? new Date().toISOString()) : null,
  }));

  // Calculate pointsToNextLevel and nextLevel
  let pointsToNextLevel = 0;
  let nextLevel: UserLevel | null = null;

  const currentThresholdIndex = LEVEL_THRESHOLDS.findIndex(
    (t) => points >= t.minPoints && points <= t.maxPoints
  );

  if (currentThresholdIndex >= 0 && currentThresholdIndex < LEVEL_THRESHOLDS.length - 1) {
    const nextThreshold = LEVEL_THRESHOLDS[currentThresholdIndex + 1];
    pointsToNextLevel = nextThreshold.minPoints - points;
    nextLevel = nextThreshold.level;
  }
  // If at max level (Green Guardian), pointsToNextLevel = 0 and nextLevel = null (defaults)

  const response: UserStatsResponse = {
    points,
    level,
    streak,
    badges,
    totalSessions,
    lastTriageDate,
    pointsToNextLevel,
    nextLevel,
  };

  return successResponse(200, response);
}

// --- Main handler (router) ---

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.resource || event.path;

  try {
    // POST /auth/register
    if (method === 'POST' && path.endsWith('/register')) {
      return await handleRegister(event);
    }

    // POST /auth/login
    if (method === 'POST' && path.endsWith('/login')) {
      return await handleLogin(event);
    }

    // GET /auth/profile
    if (method === 'GET' && path.endsWith('/profile')) {
      return await handleGetProfile(event);
    }

    // GET /auth/stats
    if (method === 'GET' && path.endsWith('/stats')) {
      return await handleGetStats(event);
    }

    // PUT /auth/profile
    if (method === 'PUT' && path.endsWith('/profile')) {
      return await handleUpdateProfile(event);
    }

    // Method/path not matched
    return errorResponse(404, {
      error: { code: 'VALIDATION_ERROR', message: `Route not found: ${method} ${path}` },
    });
  } catch (err) {
    console.error('AuthHandler unexpected error:', err);
    return errorResponse(500, {
      error: { code: 'INTERNAL_ERROR' as any, message: 'An unexpected error occurred' },
    });
  }
};
