import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionStore } from '../session-store';
import { PollSessionResponse, ErrorResponse } from '@resource-ai/shared';
import { UserStore } from '../auth/user-store';
import { getRoleFromEvent, resolveAuthenticatedUserId } from '../auth/request-identity';

const sessionStore = new SessionStore();
const userStore = new UserStore();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

/**
 * PollHandler - Reads session state from DynamoDB and returns current results.
 *
 * GET /sessions/{sessionId}
 * - Returns 200 with PollSessionResponse on success
 * - Returns 403 if user does not own the session (unless manager)
 * - Returns 404 if session not found
 * - Returns 500 for unexpected errors
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing sessionId path parameter',
        },
      };
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Extract userId and role from authorizer context
    const userId = await resolveAuthenticatedUserId(event, userStore);
    const role = getRoleFromEvent(event);

    const session = await sessionStore.getSession(sessionId);

    if (!session) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      };
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Verify session ownership: userId must match OR user must be a manager
    if (userId && session.userId && session.userId !== userId && role !== 'manager') {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this session',
        },
      };
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    const response: PollSessionResponse = {
      sessionId: session.sessionId,
      status: session.status,
      currentStage: session.currentStage,
      error: session.error,
      stages: session.stages,
      inputs: session.inputs,
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('PollHandler error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while retrieving session status',
      },
    };
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify(errorResponse),
    };
  }
};
