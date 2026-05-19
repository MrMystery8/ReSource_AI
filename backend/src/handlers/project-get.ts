import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ErrorResponse, Project } from '@resource-ai/shared';
import { UserStore } from '../auth/user-store';
import { resolveAuthenticatedUserId } from '../auth/request-identity';

const PROJECTS_TABLE_NAME = process.env.PROJECTS_TABLE_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const userStore = new UserStore();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

/**
 * ProjectGetHandler - Returns a single project by projectId.
 *
 * GET /projects/:projectId
 * - Requires authenticated user (userId from Lambda authorizer)
 * - Returns 200 with the full Project object on success
 * - Returns 403 if the project belongs to a different user
 * - Returns 404 if the project is not found
 * - Returns 500 for unexpected errors
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract userId from Lambda authorizer context
    const userId = await resolveAuthenticatedUserId(event, userStore);

    if (!userId) {
      const errorResponse: ErrorResponse = {
        error: { code: 'AUTH_FAILURE', message: 'User not authenticated' },
      };
      return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    // Extract projectId from path parameters
    const projectId = event.pathParameters?.projectId;
    if (!projectId) {
      const errorResponse: ErrorResponse = {
        error: { code: 'VALIDATION_ERROR', message: 'projectId path parameter is required' },
      };
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    // Fetch the project from DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: PROJECTS_TABLE_NAME,
        Key: { projectId },
      })
    );

    if (!result.Item) {
      const errorResponse: ErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      };
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    const project = result.Item as Project;

    // Ensure the project belongs to the requesting user
    if (project.userId !== userId) {
      const errorResponse: ErrorResponse = {
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this project' },
      };
      return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(project),
    };
  } catch (err) {
    console.error('ProjectGetHandler unexpected error:', err);
    const errorResponse: ErrorResponse = {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    };
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
  }
};
