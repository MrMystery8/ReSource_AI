import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  UserSessionsResponse,
  SessionSummary,
  TriageSession,
  ErrorResponse,
} from '@resource-ai/shared';
import { UserStore } from '../auth/user-store';
import { resolveAuthenticatedUserId } from '../auth/request-identity';

const TABLE_NAME = process.env.TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const userStore = new UserStore();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

/**
 * SessionsHandler - Returns the authenticated user's sessions, paginated and sorted by createdAt descending.
 *
 * GET /sessions
 * Query params: limit (default 10), offset (default 0)
 * - Returns 200 with UserSessionsResponse on success
 * - Returns 401 if userId is not available from authorizer
 * - Returns 500 for unexpected errors
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract userId from authorizer context
    const userId = await resolveAuthenticatedUserId(event, userStore);

    if (!userId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'AUTH_FAILURE',
          message: 'User not authenticated',
        },
      };
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Parse pagination params
    const limit = Math.min(
      100,
      Math.max(1, parseInt(event.queryStringParameters?.limit || '10', 10) || 10)
    );
    const offset = Math.max(
      0,
      parseInt(event.queryStringParameters?.offset || '0', 10) || 0
    );

    // Query sessions for this user using the userId-index GSI
    const { sessions, total } = await queryUserSessions(userId, limit, offset);

    // Map to SessionSummary format
    const sessionSummaries: SessionSummary[] = sessions.map(mapToSessionSummary);

    const response: UserSessionsResponse = {
      sessions: sessionSummaries,
      total,
      limit,
      offset,
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('SessionsHandler error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while retrieving sessions',
      },
    };
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify(errorResponse),
    };
  }
};

/**
 * Query sessions by userId using the userId-index GSI.
 * Results are sorted by createdAt descending (ScanIndexForward: false).
 * Applies offset-based pagination.
 */
async function queryUserSessions(
  userId: string,
  limit: number,
  offset: number
): Promise<{ sessions: TriageSession[]; total: number }> {
  // Get total count for this user
  const countResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    })
  );
  const total = countResult.Count ?? 0;

  // If offset is beyond total, return empty
  if (offset >= total) {
    return { sessions: [], total };
  }

  // Query with descending sort (most recent first)
  const allItems: TriageSession[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scannedCount = 0;

  while (true) {
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false, // Sort by createdAt descending
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = (queryResult.Items ?? []) as TriageSession[];

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

/**
 * Maps a TriageSession to a SessionSummary.
 * Extracts deviceName from quickVerdict.deviceIdentification
 * Extracts riskLevel from safetyGate.riskLevel
 * Extracts salvageScore from quickVerdict.salvageScore
 */
function mapToSessionSummary(session: TriageSession): SessionSummary {
  const quickVerdict = session.stages?.quickVerdict;
  const safetyGate = session.stages?.safetyGate;

  return {
    sessionId: session.sessionId,
    deviceName: quickVerdict?.deviceIdentification || session.inputs?.deviceIdentity || 'Unknown Device',
    riskLevel: safetyGate?.riskLevel || quickVerdict?.riskLevel || null,
    salvageScore: quickVerdict?.salvageScore ?? null,
    status: session.status,
    createdAt: session.createdAt,
    pointsEarned: 0, // Will be populated once gamification service is integrated
  };
}
