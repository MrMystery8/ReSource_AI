import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  LeaderboardEntry,
  LeaderboardResponse,
  ErrorResponse,
} from '@resource-ai/shared';
import { calculateLevel } from '../gamification/gamification-service';

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

const TOP_N = 20;

interface UserRecord {
  userId: string;
  displayName: string;
  points?: number;
  badges?: string[];
}

/**
 * LeaderboardHandler - Returns the top 20 users ranked by points.
 *
 * GET /leaderboard
 * - Returns 200 with LeaderboardResponse on success
 * - Returns 401 if userId is not available from authorizer
 * - Returns 500 for unexpected errors
 *
 * The response includes:
 * - entries: Top 20 LeaderboardEntry objects sorted by points descending
 * - currentUserRank: The authenticated user's rank (even if not in top 20)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract userId from authorizer context
    const userId =
      (event.requestContext.authorizer?.lambda?.userId as string | undefined) ||
      (event.requestContext.authorizer?.userId as string | undefined);

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

    // Scan all users from the users table
    const users = await scanAllUsers();

    // Sort by points descending
    users.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    // Find current user's rank (1-indexed)
    let currentUserRank: number | null = null;
    const currentUserIndex = users.findIndex((u) => u.userId === userId);
    if (currentUserIndex !== -1) {
      currentUserRank = currentUserIndex + 1;
    }

    // Take top 20 and map to LeaderboardEntry
    const topUsers = users.slice(0, TOP_N);
    const entries: LeaderboardEntry[] = topUsers.map((user, index) => ({
      rank: index + 1,
      displayName: user.displayName || 'Anonymous',
      level: calculateLevel(user.points ?? 0),
      points: user.points ?? 0,
      badgeCount: user.badges?.length ?? 0,
      isCurrentUser: user.userId === userId,
    }));

    const response: LeaderboardResponse = {
      entries,
      currentUserRank,
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('LeaderboardHandler error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while retrieving the leaderboard',
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
 * Scans all users from the users table.
 * For <1000 users, a full scan is acceptable.
 * Only projects the fields needed for the leaderboard to minimize data transfer.
 */
async function scanAllUsers(): Promise<UserRecord[]> {
  const allUsers: UserRecord[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: USERS_TABLE_NAME,
        ProjectionExpression: 'userId, displayName, points, badges',
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = (result.Items ?? []) as UserRecord[];
    allUsers.push(...items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allUsers;
}
