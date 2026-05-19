import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { validateUploadRequest, ValidationError } from '../validator';
import { FileStore } from '../file-store';
import {
  MAX_FILES_PER_SESSION,
  ALLOWED_CONTENT_TYPES,
  UploadFileResponse,
  ErrorResponse,
} from '@resource-ai/shared';
import { UserStore } from '../auth/user-store';
import { resolveAuthenticatedUserId } from '../auth/request-identity';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

/**
 * Map of content types to file extensions.
 */
const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/html': 'html',
  'text/csv': 'csv',
  'application/json': 'json',
};

let fileStore: FileStore | undefined;
const userStore = new UserStore();

function getFileStore(): FileStore {
  if (!fileStore) {
    fileStore = new FileStore();
  }
  return fileStore;
}

/**
 * Retrieves the count of files already uploaded for a given session.
 * Checks the DynamoDB session record's inputs.fileIds array length.
 */
async function getSessionFileCount(sessionId: string): Promise<number> {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { sessionId },
      ProjectionExpression: 'inputs.fileIds',
    })
  );

  // If session doesn't exist or has no fileIds, count is 0
  if (!result.Item) {
    return 0;
  }

  const fileIds = result.Item?.inputs?.fileIds;
  if (Array.isArray(fileIds)) {
    return fileIds.length;
  }

  return 0;
}

/**
 * Determines the file extension from a content type.
 */
function getExtensionFromContentType(contentType: string): string {
  return CONTENT_TYPE_TO_EXTENSION[contentType] ?? 'bin';
}

/**
 * Constructs a file name from the fileId and extension.
 */
function buildFileName(fileId: string, extension: string): string {
  return `${fileId}.${extension}`;
}

/**
 * UploadHandler - Validates and stores device evidence files in S3.
 *
 * Expects:
 * - JSON body with { file: base64String, contentType: mimeType, fileName: originalName }
 * - Content-Type: application/json header
 * - JWT authorizer context for authenticated access
 * - x-session-id header or sessionId query parameter for session association
 *
 * Returns:
 * - 201 with { fileId, fileName, contentType } on success
 * - 400 for unsupported file formats
 * - 413 for files exceeding 10 MB
 * - 500 for S3 unavailability (without failing the session)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract userId from authorizer context (for audit trail and access control)
    const userId = await resolveAuthenticatedUserId(event, userStore);

    if (!userId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'AUTH_FAILURE',
          message: 'Unauthorized',
        },
      };
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Extract session ID from custom header or query parameter for session association
    const sessionId =
      event.headers['x-session-id'] ??
      event.headers['X-Session-Id'] ??
      event.queryStringParameters?.sessionId ??
      'unassociated';

    console.log(`Upload initiated by userId: ${userId}, sessionId: ${sessionId}`);

    // Parse request body
    if (!event.body) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body is empty. A file must be provided.',
          field: 'body',
        },
      };
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Determine content type and file buffer based on request format
    let contentType: string;
    let fileBuffer: Buffer;

    const requestContentType =
      event.headers['content-type'] ??
      event.headers['Content-Type'] ??
      '';

    if (requestContentType.includes('application/json')) {
      // JSON body format: { file: base64String, contentType: mimeType, fileName: originalName }
      let parsed: { file?: string; contentType?: string; fileName?: string };
      try {
        const rawBody = event.isBase64Encoded
          ? Buffer.from(event.body, 'base64').toString('utf-8')
          : event.body;
        parsed = JSON.parse(rawBody);
      } catch {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON body.',
            field: 'body',
          },
        };
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify(errorResponse),
        };
      }

      if (!parsed.file || !parsed.contentType) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must include "file" (base64) and "contentType" fields.',
            field: 'body',
          },
        };
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify(errorResponse),
        };
      }

      contentType = parsed.contentType;
      fileBuffer = Buffer.from(parsed.file, 'base64');
    } else {
      // Legacy format: raw/base64 body with Content-Type header indicating file type
      contentType = requestContentType;

      if (!contentType) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing Content-Type header.',
            field: 'contentType',
          },
        };
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify(errorResponse),
        };
      }

      fileBuffer = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body, 'base64');
    }

    const fileSize = fileBuffer.length;

    // Validate content type and file size
    try {
      validateUploadRequest(contentType, fileSize);
    } catch (err) {
      if (err instanceof ValidationError) {
        // Determine appropriate status code
        const statusCode = err.field === 'fileSize' ? 413 : 400;
        const errorResponse: ErrorResponse =
          err.field === 'fileSize'
            ? {
                error: {
                  code: 'SIZE_EXCEEDED',
                  message: err.message,
                  field: err.field,
                },
              }
            : err.toErrorResponse();

        return {
          statusCode,
          headers: CORS_HEADERS,
          body: JSON.stringify(errorResponse),
        };
      }
      throw err;
    }

    // Check session file count (max 5 per session)
    let currentFileCount: number;
    try {
      currentFileCount = await getSessionFileCount(sessionId);
    } catch (err) {
      // If we can't check the count (DynamoDB issue), allow the upload
      // to proceed rather than blocking the user
      currentFileCount = 0;
    }

    if (currentFileCount >= MAX_FILES_PER_SESSION) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Maximum of ${MAX_FILES_PER_SESSION} files per session has been reached.`,
          field: 'fileCount',
        },
      };
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Generate file ID and determine extension
    const fileId = uuidv4();
    const extension = getExtensionFromContentType(contentType);
    const fileName = buildFileName(fileId, extension);

    // Store file via FileStore (S3)
    let s3Key: string;
    try {
      const store = getFileStore();
      s3Key = await store.uploadFile(sessionId, fileId, fileBuffer, contentType, extension);
    } catch (err) {
      // Handle S3 unavailability gracefully — return error without failing session
      console.error('S3 upload failed:', err);
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'File storage is currently unavailable. Please try again later.',
        },
      };
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify(errorResponse),
      };
    }

    // Return success response
    const response: UploadFileResponse = {
      fileId,
      fileName,
      contentType,
      s3Key,
    };

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('Unexpected error in upload handler:', err);
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing the upload.',
      },
    };
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify(errorResponse),
    };
  }
};
