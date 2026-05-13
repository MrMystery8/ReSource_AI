import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ErrorResponse, Project } from '@resource-ai/shared';

const PROJECTS_TABLE_NAME = process.env.PROJECTS_TABLE_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

// --- Request interface ---

interface UpdateProjectRequest {
  action: 'abandon' | 'delete';
}

// --- Validation ---

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateRequest(body: unknown): UpdateProjectRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const b = body as Record<string, unknown>;

  if (b.action !== 'abandon' && b.action !== 'delete') {
    throw new ValidationError(
      "action must be either 'abandon' or 'delete'",
      'action'
    );
  }

  return { action: b.action as 'abandon' | 'delete' };
}

// --- Response helpers ---

function errorResponse(
  statusCode: number,
  error: ErrorResponse
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(error),
  };
}

function successResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// --- DynamoDB helpers ---

async function getProject(projectId: string): Promise<Project | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PROJECTS_TABLE_NAME,
      Key: { projectId },
    })
  );

  return result.Item ? (result.Item as Project) : null;
}

async function abandonProject(projectId: string): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: PROJECTS_TABLE_NAME,
      Key: { projectId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'abandoned',
        ':updatedAt': now,
      },
    })
  );
}

async function deleteProject(projectId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: PROJECTS_TABLE_NAME,
      Key: { projectId },
    })
  );
}

// --- Main handler ---

/**
 * ProjectUpdateHandler - Abandons or permanently deletes a project.
 *
 * PATCH /projects/:projectId
 * - Requires authenticated user (userId from Lambda authorizer)
 * - Accepts UpdateProjectRequest body: { action: 'abandon' | 'delete' }
 * - For 'abandon': validates project is 'in-progress', updates status to 'abandoned'
 * - For 'delete': permanently removes the project record from DynamoDB
 * - Returns 400 for invalid status transitions (e.g., abandoning a completed project)
 * - Returns 403 if project belongs to a different user
 * - Returns 404 if project not found
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract userId from Lambda authorizer context
    const userId =
      (event.requestContext.authorizer?.lambda?.userId as string | undefined) ??
      (event.requestContext.authorizer?.userId as string | undefined);

    if (!userId) {
      return errorResponse(401, {
        error: { code: 'AUTH_FAILURE', message: 'User not authenticated' },
      });
    }

    // 2. Extract projectId from path parameters
    const projectId = event.pathParameters?.projectId;
    if (!projectId) {
      return errorResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId path parameter is required',
        },
      });
    }

    // 3. Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(event.body || '');
    } catch {
      return errorResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be valid JSON',
        },
      });
    }

    let req: UpdateProjectRequest;
    try {
      req = validateRequest(rawBody);
    } catch (err) {
      if (err instanceof ValidationError) {
        return errorResponse(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: err.message,
            ...(err.field ? { field: err.field } : {}),
          },
        });
      }
      throw err;
    }

    // 4. Fetch the project from DynamoDB
    let project: Project | null;
    try {
      project = await getProject(projectId);
    } catch (err) {
      console.error('DynamoDB GetItem failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve project. Please try again.',
        },
      });
    }

    // 5. Return 404 if project not found
    if (!project) {
      return errorResponse(404, {
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found',
        },
      });
    }

    // 6. Return 403 if project belongs to a different user
    if (project.userId !== userId) {
      return errorResponse(403, {
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify this project',
        },
      });
    }

    // 7. Perform the requested action
    if (req.action === 'abandon') {
      // Validate that the project is 'in-progress' before abandoning
      if (project.status !== 'in-progress') {
        return errorResponse(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Cannot abandon a project with status '${project.status}'. Only 'in-progress' projects can be abandoned.`,
          },
        });
      }

      try {
        await abandonProject(projectId);
      } catch (err) {
        console.error('DynamoDB UpdateItem failed:', err);
        return errorResponse(500, {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to abandon project. Please try again.',
          },
        });
      }

      console.log('Project abandoned', { projectId, userId });
      return successResponse(200, {
        projectId,
        status: 'abandoned',
        message: 'Project has been abandoned',
      });
    } else {
      // action === 'delete': permanently remove the project record
      try {
        await deleteProject(projectId);
      } catch (err) {
        console.error('DynamoDB DeleteItem failed:', err);
        return errorResponse(500, {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete project. Please try again.',
          },
        });
      }

      console.log('Project deleted', { projectId, userId });
      return successResponse(200, {
        projectId,
        message: 'Project has been permanently deleted',
      });
    }
  } catch (err) {
    console.error('ProjectUpdateHandler unexpected error:', err);
    return errorResponse(500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};
