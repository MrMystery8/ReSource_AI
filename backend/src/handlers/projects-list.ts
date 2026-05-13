import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ProjectsListResponse,
  ProjectHistoryEntry,
  Project,
  ErrorResponse,
} from '@resource-ai/shared';

const PROJECTS_TABLE_NAME = process.env.PROJECTS_TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

const DEFAULT_LIMIT = 10;

/**
 * ProjectsListHandler - Returns the authenticated user's projects, paginated and sorted by startedAt descending.
 *
 * GET /projects
 * Query params: offset (default 0)
 * - Returns 200 with ProjectsListResponse on success
 * - Returns 401 if userId is not available from authorizer
 * - Returns 500 for unexpected errors
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract userId from authorizer context
    const userId = event.requestContext.authorizer?.lambda?.userId as string | undefined
      || event.requestContext.authorizer?.userId as string | undefined;

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

    // Parse pagination params — limit is fixed at 10 per design
    const limit = DEFAULT_LIMIT;
    const offset = Math.max(
      0,
      parseInt(event.queryStringParameters?.offset || '0', 10) || 0
    );

    // Query projects for this user using the userId-index GSI
    const { projects, total } = await queryUserProjects(userId, limit, offset);

    // Map to ProjectHistoryEntry format
    const projectEntries: ProjectHistoryEntry[] = projects.map(mapToProjectHistoryEntry);

    const response: ProjectsListResponse = {
      projects: projectEntries,
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
    console.error('ProjectsListHandler error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while retrieving projects',
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
 * Query projects by userId using the userId-index GSI.
 * Results are sorted by startedAt descending (ScanIndexForward: false).
 * Applies offset-based pagination.
 */
async function queryUserProjects(
  userId: string,
  limit: number,
  offset: number
): Promise<{ projects: Project[]; total: number }> {
  // Get total count for this user
  const countResult = await docClient.send(
    new QueryCommand({
      TableName: PROJECTS_TABLE_NAME,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    })
  );
  const total = countResult.Count ?? 0;

  // If offset is beyond total, return empty
  if (offset >= total) {
    return { projects: [], total };
  }

  // Query with descending sort (most recent first)
  const allItems: Project[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scannedCount = 0;

  while (true) {
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: PROJECTS_TABLE_NAME,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false, // Sort by startedAt descending
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = (queryResult.Items ?? []) as Project[];

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

  return { projects: allItems, total };
}

/**
 * Maps a Project to a ProjectHistoryEntry.
 * Extracts grade and pointsEarned from submission if present.
 */
function mapToProjectHistoryEntry(project: Project): ProjectHistoryEntry {
  return {
    projectId: project.projectId,
    ideaTitle: project.ideaTitle,
    startedAt: project.startedAt,
    status: project.status,
    grade: project.submission?.grade,
    pointsEarned: project.submission?.points,
  };
}
