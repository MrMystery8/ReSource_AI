import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { AuthProvider, User, UserRole } from '@resource-ai/shared';
import { AvatarService } from './avatar-service';
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
  picture?: string;
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

async function tryImportGoogleAvatar(
  claims: CognitoClaims,
  userId: string,
  avatarService?: AvatarService
): Promise<string | undefined> {
  if (!avatarService || !claims.picture || inferAuthProvider(claims) !== 'google') {
    return undefined;
  }

  try {
    return await avatarService.importGoogleAvatar(userId, claims.picture);
  } catch (error) {
    console.warn('Failed to import Google avatar:', error);
    return undefined;
  }
}

export async function syncCognitoUserFromClaims(
  claims: CognitoClaims,
  userStore: UserStore,
  avatarService?: AvatarService
): Promise<User | undefined> {
  if (!claims.sub) return undefined;

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

      const nextProvider = inferAuthProvider(claims);
      if (!existingUser.authProvider || existingUser.authProvider === 'unknown') {
        updates.authProvider = nextProvider;
      }

      if (!existingUser.avatarKey) {
        const importedAvatarKey = await tryImportGoogleAvatar(claims, existingUser.userId, avatarService);
        if (importedAvatarKey) {
          updates.avatarKey = importedAvatarKey;
        }
      }

      if (Object.keys(updates).length > 0) {
        return userStore.updateUser(existingUser.userId, updates);
      }

      return existingUser;
    }
  }

  const now = new Date().toISOString();
  const displayName = claims.name?.trim() || email?.split('@')[0] || 'User';
  const avatarKey = await tryImportGoogleAvatar(claims, cognitoSub, avatarService);
  const newUser: User = {
    userId: cognitoSub,
    email: email ?? `${cognitoSub}@users.local`,
    passwordHash: '',
    displayName,
    avatarKey,
    role: inferRole(claims),
    cognitoSub,
    authProvider: inferAuthProvider(claims),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await userStore.createUser(newUser);
    return newUser;
  } catch {
    if (email) {
      const created = await userStore.getUserByEmail(email);
      if (created) {
        if (!created.avatarKey && avatarKey) {
          return userStore.updateUser(created.userId, { avatarKey });
        }
        return created;
      }
    }
  }

  return newUser;
}

export async function resolveAuthenticatedUserId(
  event: APIGatewayProxyEvent,
  userStore: UserStore
): Promise<string | undefined> {
  const legacyUserId = getLegacyUserId(event);
  if (legacyUserId) return legacyUserId;

  const claims = getCognitoClaims(event);
  if (!claims?.sub) return undefined;

  const avatarService = process.env.BUCKET_NAME ? new AvatarService() : undefined;
  const user = await syncCognitoUserFromClaims(claims, userStore, avatarService);
  return user?.userId;
}
