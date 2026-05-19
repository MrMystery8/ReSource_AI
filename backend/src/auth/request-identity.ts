import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { AuthProvider, User, UserRole } from '@resource-ai/shared';
import { UserStore } from './user-store';

type AuthorizerShape = {
  lambda?: { userId?: string; role?: string };
  userId?: string;
  role?: string;
  claims?: Record<string, string>;
};

interface CognitoClaims {
  sub?: string;
  email?: string;
  name?: string;
  identities?: string;
  ['cognito:groups']?: string | string[];
}

function getAuthorizer(event: APIGatewayProxyEvent): AuthorizerShape {
  return (event.requestContext.authorizer ?? {}) as unknown as AuthorizerShape;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseGroups(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
}

function inferAuthProvider(claims: CognitoClaims): AuthProvider {
  const identities = claims.identities?.toLowerCase() ?? '';
  if (identities.includes('google')) return 'google';
  if (identities.includes('apple')) return 'apple';
  if (identities.length > 0) return 'cognito';
  return 'cognito';
}

function inferRole(claims: CognitoClaims, existingRole?: UserRole): UserRole {
  const groups = parseGroups(claims['cognito:groups']);
  if (groups.includes('manager')) return 'manager';
  return existingRole ?? 'user';
}

export function getCognitoClaims(event: APIGatewayProxyEvent): CognitoClaims | null {
  const authorizer = getAuthorizer(event);
  if (!authorizer.claims) return null;
  return authorizer.claims as CognitoClaims;
}

export function getLegacyUserId(event: APIGatewayProxyEvent): string | undefined {
  const authorizer = getAuthorizer(event);
  return authorizer.lambda?.userId ?? authorizer.userId;
}

export function getLegacyRole(event: APIGatewayProxyEvent): UserRole | undefined {
  const authorizer = getAuthorizer(event);
  const role = authorizer.lambda?.role ?? authorizer.role;
  if (role === 'manager' || role === 'user') return role;
  return undefined;
}

export function getRoleFromEvent(event: APIGatewayProxyEvent): UserRole | undefined {
  const legacyRole = getLegacyRole(event);
  if (legacyRole) return legacyRole;
  const claims = getCognitoClaims(event);
  if (!claims) return undefined;
  return inferRole(claims);
}

export async function resolveAuthenticatedUserId(
  event: APIGatewayProxyEvent,
  userStore: UserStore
): Promise<string | undefined> {
  const legacyUserId = getLegacyUserId(event);
  if (legacyUserId) return legacyUserId;

  const claims = getCognitoClaims(event);
  if (!claims?.sub) return undefined;

  const cognitoSub = claims.sub;
  const email = claims.email ? normalizeEmail(claims.email) : undefined;

  if (email) {
    const existingUser = await userStore.getUserByEmail(email);
    if (existingUser) {
      const updates: Partial<User> = {};
      const nextRole = inferRole(claims, existingUser.role);

      if (existingUser.cognitoSub !== cognitoSub) {
        updates.cognitoSub = cognitoSub;
      }

      if (existingUser.role !== nextRole) {
        updates.role = nextRole;
      }

      if (!existingUser.authProvider) {
        updates.authProvider = inferAuthProvider(claims);
      }

      if (Object.keys(updates).length > 0) {
        await userStore.updateUser(existingUser.userId, updates);
      }

      return existingUser.userId;
    }
  }

  const now = new Date().toISOString();
  const displayName = claims.name?.trim() || email?.split('@')[0] || 'User';
  const newUser: User = {
    userId: cognitoSub,
    email: email ?? `${cognitoSub}@users.local`,
    passwordHash: '',
    displayName,
    role: inferRole(claims),
    cognitoSub,
    authProvider: inferAuthProvider(claims),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await userStore.createUser(newUser);
  } catch {
    if (email) {
      const created = await userStore.getUserByEmail(email);
      if (created) return created.userId;
    }
  }

  return newUser.userId;
}
