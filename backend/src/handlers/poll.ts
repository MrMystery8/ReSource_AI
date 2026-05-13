import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SessionStore } from '../session-store';
import { FileStore } from '../file-store';
import { PollSessionResponse, ErrorResponse } from '@resource-ai/shared';

const sessionStore = new SessionStore();
const fileStore = new FileStore();

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

    // Generate pre-signed URL for concept visual if it contains an S3 key (not already a URL)
    const stages = { ...session.stages };
    if (stages.conceptVisual?.imageUrl) {
      const imageUrl = stages.conceptVisual.imageUrl;
      // If the imageUrl is an S3 key (not starting with http), generate a pre-signed URL
      if (!imageUrl.startsWith('http')) {
        const presignedUrl = await fileStore.getFileUrl(imageUrl);
        stages.conceptVisual = { imageUrl: presignedUrl };
      }
    }

    const response: PollSessionResponse = {
      sessionId: session.sessionId,
      status: session.status,
      currentStage: session.currentStage,
      error: session.error,
      stages,
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
