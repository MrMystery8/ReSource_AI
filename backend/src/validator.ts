import {
  CreateSessionRequest,
  ErrorResponse,
} from '@resource-ai/shared';
import {
  MAX_FIELD_LENGTH,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_CONTENT_TYPES,
} from '@resource-ai/shared';

/**
 * Custom error class for validation failures.
 * Includes the field name that failed validation and a descriptive message.
 */
export class ValidationError extends Error {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }

  /**
   * Converts this ValidationError into a structured ErrorResponse.
   */
  toErrorResponse(): ErrorResponse {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: this.message,
        field: this.field,
      },
    };
  }
}

/**
 * Validates and parses a POST /sessions request body.
 * Ensures all required fields are present, non-empty after trimming,
 * and within the maximum character length. Optional fileIds must be
 * an array of strings if present.
 *
 * @param body - The raw request body (unknown type)
 * @returns A validated CreateSessionRequest object
 * @throws ValidationError if any validation rule is violated
 */
export function validateCreateSessionRequest(body: unknown): CreateSessionRequest {
  if (body === null || body === undefined || typeof body !== 'object') {
    throw new ValidationError('body', 'Request body must be a JSON object');
  }

  const obj = body as Record<string, unknown>;

  // Validate required string fields (deviceIdentity, failureSymptoms)
  const requiredStringFields: Array<keyof Pick<CreateSessionRequest, 'deviceIdentity' | 'failureSymptoms'>> = [
    'deviceIdentity',
    'failureSymptoms',
  ];

  for (const field of requiredStringFields) {
    const value = obj[field];

    if (value === undefined || value === null) {
      throw new ValidationError(field, `${field} is required`);
    }

    if (typeof value !== 'string') {
      throw new ValidationError(field, `${field} must be a string`);
    }

    if (value.trim().length === 0) {
      throw new ValidationError(field, `${field} must not be empty or whitespace-only`);
    }

    if (value.length > MAX_FIELD_LENGTH) {
      throw new ValidationError(
        field,
        `${field} must not exceed ${MAX_FIELD_LENGTH} characters`
      );
    }
  }

  // Validate structured userContext object
  const userContextRaw = obj.userContext;
  if (userContextRaw === undefined || userContextRaw === null) {
    throw new ValidationError('userContext', 'userContext is required');
  }
  if (typeof userContextRaw !== 'object' || Array.isArray(userContextRaw)) {
    throw new ValidationError('userContext', 'userContext must be an object');
  }
  const ctx = userContextRaw as Record<string, unknown>;

  const validExpertiseLevels = ['Beginner', 'Intermediate', 'Expert'];
  if (!validExpertiseLevels.includes(ctx.expertiseLevel as string)) {
    throw new ValidationError('userContext.expertiseLevel', `expertiseLevel must be one of: ${validExpertiseLevels.join(', ')}`);
  }

  const validMotivations = ['Learn Something New', 'Environmental Impact', 'Save Money', 'Creative Project'];
  if (!validMotivations.includes(ctx.motivation as string)) {
    throw new ValidationError('userContext.motivation', `motivation must be one of: ${validMotivations.join(', ')}`);
  }

  const validMaterialAvailability = ['Basic Household Tools', 'Some Electronics Tools', 'Full Workshop'];
  if (!validMaterialAvailability.includes(ctx.materialAvailability as string)) {
    throw new ValidationError('userContext.materialAvailability', `materialAvailability must be one of: ${validMaterialAvailability.join(', ')}`);
  }

  const validTimeCommitments = ['Under 1 Hour', '1-3 Hours', 'Half Day', 'Multi-Day Project'];
  if (!validTimeCommitments.includes(ctx.timeCommitment as string)) {
    throw new ValidationError('userContext.timeCommitment', `timeCommitment must be one of: ${validTimeCommitments.join(', ')}`);
  }

  // Validate optional fileIds
  if (obj.fileIds !== undefined && obj.fileIds !== null) {
    if (!Array.isArray(obj.fileIds)) {
      throw new ValidationError('fileIds', 'fileIds must be an array');
    }

    for (let i = 0; i < obj.fileIds.length; i++) {
      if (typeof obj.fileIds[i] !== 'string') {
        throw new ValidationError('fileIds', `fileIds[${i}] must be a string`);
      }
    }
  }

  return {
    deviceIdentity: obj.deviceIdentity as string,
    failureSymptoms: obj.failureSymptoms as string,
    userContext: obj.userContext as import('@resource-ai/shared').StructuredUserContext,
    fileIds: obj.fileIds as string[] | undefined,
  };
}

/**
 * Validates file upload parameters for POST /upload.
 * Checks that the content type is in the allowed list and the file size
 * does not exceed the maximum.
 *
 * @param contentType - The MIME type of the uploaded file
 * @param fileSize - The size of the uploaded file in bytes
 * @throws ValidationError if content type is not allowed or file size exceeds limit
 */
export function validateUploadRequest(contentType: string, fileSize: number): void {
  const allowedTypes: readonly string[] = ALLOWED_CONTENT_TYPES;

  if (!allowedTypes.includes(contentType)) {
    throw new ValidationError(
      'contentType',
      `Unsupported file type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`
    );
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      'fileSize',
      `File size ${fileSize} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes (10 MB)`
    );
  }
}
