import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { UserStore } from '../auth/user-store';
import { getRoleFromEvent } from '../auth/request-identity';
import {
  UserProfile,
  UserRole,
  UsersListResponse,
  SessionsListResponse,
  ErrorResponse,
} from '@resource-ai/shared';

const SESSIONS_TABLE_NAME = process.env.SESSIONS_TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const userStore = new UserStore();

const VALID_ROLES: UserRole[] = ['user', 'manager'];

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

function errorResponse(statusCode: number, body: ErrorResponse): APIGatewayProxyResult {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function toUserProfile(user: { userId: string; email: string; displayName: string; role: UserRole; createdAt: string; passwordHash?: string }): UserProfile {
  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * AdminHandler - Handles admin-only endpoints for user and session management.
 *
 * Routes:
 * - GET /admin/users — List all users (paginated)
 * - PUT /admin/users/{userId}/role — Update a user's role
 * - GET /admin/sessions — List all sessions (paginated, optional userId filter)
 *
 * All routes require the 'manager' role.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Check manager role from authorizer context
    const role = getRoleFromEvent(event);

    if (role !== 'manager') {
      return errorResponse(403, {
        error: { code: 'FORBIDDEN', message: 'Manager role required' },
      });
    }

    const method = event.httpMethod;
    const path = event.resource || event.path;

    // Route: GET /admin/users
    if (method === 'GET' && path.match(/\/admin\/users$/)) {
      return await handleListUsers(event);
    }

    // Route: PUT /admin/users/{userId}/role
    if (method === 'PUT' && path.match(/\/admin\/users\/.*\/role$/)) {
      return await handleUpdateRole(event);
    }

    // Route: GET /admin/sessions
    if (method === 'GET' && path.match(/\/admin\/sessions$/)) {
      return await handleListSessions(event);
    }

    return errorResponse(404, {
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  } catch (err) {
    console.error('AdminHandler unexpected error:', err);
    return errorResponse(500, {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  }
};

/**
 * GET /admin/users — List all users with pagination.
 * Query params: limit (default 50), offset (default 0)
 */
async function handleListUsers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const limit = Math.max(1, parseInt(event.queryStringParameters?.limit || '50', 10) || 50);
  const offset = Math.max(0, parseInt(event.queryStringParameters?.offset || '0', 10) || 0);

  const { users, total } = await userStore.listUsers(limit, offset);

  const response: UsersListResponse = {
    users: users.map(toUserProfile),
    total,
    limit,
    offset,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response),
  };
}

/**
 * PUT /admin/users/{userId}/role — Update a user's role.
 * Body: { "role": "user" | "manager" }
 */
async function handleUpdateRole(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'userId path parameter is required', field: 'userId' },
    });
  }

  // Parse body
  let body: { role?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  const newRole = body.role;

  // Validate role value
  if (!newRole || !VALID_ROLES.includes(newRole as UserRole)) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid role value', field: 'role' },
    });
  }

  // Check user exists
  const existingUser = await userStore.getUserById(userId);
  if (!existingUser) {
    return errorResponse(404, {
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  // Update role
  const updatedUser = await userStore.updateUser(userId, { role: newRole as UserRole });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(toUserProfile(updatedUser)),
  };
}

/**
 * GET /admin/sessions — List all sessions with pagination.
 * Query params: limit (default 50), offset (default 0), userId (optional filter)
 */
async function handleListSessions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const limit = Math.max(1, parseInt(event.queryStringParameters?.limit || '50', 10) || 50);
  const offset = Math.max(0, parseInt(event.queryStringParameters?.offset || '0', 10) || 0);
  const userIdFilter = event.queryStringParameters?.userId;

  let sessions: Record<string, unknown>[];
  let total: number;

  if (userIdFilter) {
    // Query the userId-index GSI for a specific user's sessions
    const result = await querySessionsByUserId(userIdFilter, limit, offset);
    sessions = result.sessions;
    total = result.total;
  } else {
    // Scan all sessions
    const result = await scanSessions(limit, offset);
    sessions = result.sessions;
    total = result.total;
  }

  const response: SessionsListResponse = {
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId as string,
      userId: (s.userId as string) || '',
      status: s.status as 'processing' | 'complete' | 'failed',
      createdAt: s.createdAt as string,
      currentStage: (s.currentStage as string | null) ?? null,
    })),
    total,
    limit,
    offset,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response),
  };
}

/**
 * Scan all sessions with offset-based pagination.
 */
async function scanSessions(
  limit: number,
  offset: number
): Promise<{ sessions: Record<string, unknown>[]; total: number }> {
  // Get total count
  const countResult = await docClient.send(
    new ScanCommand({
      TableName: SESSIONS_TABLE_NAME,
      Select: 'COUNT',
    })
  );
  const total = countResult.Count ?? 0;

  // Scan with pagination
  const allItems: Record<string, unknown>[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scannedCount = 0;

  while (true) {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: SESSIONS_TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = (scanResult.Items ?? []) as Record<string, unknown>[];

    for (const item of items) {
      if (scannedCount >= offset && allItems.length < limit) {
        allItems.push(item);
      }
      scannedCount++;

      if (allItems.length >= limit) {
        break;
      }
    }

    if (allItems.length >= limit || !scanResult.LastEvaluatedKey) {
      break;
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  }

  return { sessions: allItems, total };
}

/**
 * Query sessions by userId using the userId-index GSI with offset-based pagination.
 */
async function querySessionsByUserId(
  userId: string,
  limit: number,
  offset: number
): Promise<{ sessions: Record<string, unknown>[]; total: number }> {
  // Get total count for this user
  const countResult = await docClient.send(
    new QueryCommand({
      TableName: SESSIONS_TABLE_NAME,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    })
  );
  const total = countResult.Count ?? 0;

  // Query with pagination
  const allItems: Record<string, unknown>[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scannedCount = 0;

  while (true) {
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: SESSIONS_TABLE_NAME,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = (queryResult.Items ?? []) as Record<string, unknown>[];

    for (const item of items) {
      if (scannedCount >= offset && allItems.length < limit) {
        allItems.push(item);
      }
      scannedCount++;

      if (allItems.length >= limit) {
        break;
      }
    }

    if (allItems.length >= limit || !queryResult.LastEvaluatedKey) {
      break;
    }

    lastEvaluatedKey = queryResult.LastEvaluatedKey;
  }

  return { sessions: allItems, total };
}
