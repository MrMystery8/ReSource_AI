import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ErrorResponse } from '@resource-ai/shared';
import { BedrockClient } from '../bedrock-client';
import { gradeToPoints } from '../grading/grade-points';

const PROJECTS_TABLE_NAME = process.env.PROJECTS_TABLE_NAME!;
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const bedrockClient = new BedrockClient();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

// --- Constants ---

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedPhotoContentType = (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number];

// --- Request / Response interfaces ---

interface GuideContext {
  ideaTitle: string;
  expectedOutcome: string;
  steps: string[];
}

interface SubmitProjectRequest {
  projectId: string;
  photoFileIds: string[]; // 2-6 S3 file keys
  guideContext: GuideContext;
}

interface SubmitProjectResponse {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  points: number;
  feedback: string;
}

// --- Validation helpers ---

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateRequest(body: unknown): SubmitProjectRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const b = body as Record<string, unknown>;

  if (typeof b.projectId !== 'string' || b.projectId.trim() === '') {
    throw new ValidationError('projectId is required', 'projectId');
  }

  if (!Array.isArray(b.photoFileIds)) {
    throw new ValidationError('photoFileIds must be an array', 'photoFileIds');
  }

  if (b.photoFileIds.length < MIN_PHOTOS || b.photoFileIds.length > MAX_PHOTOS) {
    throw new ValidationError(
      `photoFileIds must contain between ${MIN_PHOTOS} and ${MAX_PHOTOS} items`,
      'photoFileIds'
    );
  }

  if (b.photoFileIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
    throw new ValidationError(
      'Each photoFileId must be a non-empty string',
      'photoFileIds'
    );
  }

  if (typeof b.guideContext !== 'object' || b.guideContext === null) {
    throw new ValidationError('guideContext is required', 'guideContext');
  }

  const gc = b.guideContext as Record<string, unknown>;

  if (typeof gc.ideaTitle !== 'string' || gc.ideaTitle.trim() === '') {
    throw new ValidationError('guideContext.ideaTitle is required', 'guideContext.ideaTitle');
  }

  if (typeof gc.expectedOutcome !== 'string' || gc.expectedOutcome.trim() === '') {
    throw new ValidationError(
      'guideContext.expectedOutcome is required',
      'guideContext.expectedOutcome'
    );
  }

  if (!Array.isArray(gc.steps) || gc.steps.some((s) => typeof s !== 'string')) {
    throw new ValidationError(
      'guideContext.steps must be an array of strings',
      'guideContext.steps'
    );
  }

  return {
    projectId: (b.projectId as string).trim(),
    photoFileIds: b.photoFileIds as string[],
    guideContext: {
      ideaTitle: (gc.ideaTitle as string).trim(),
      expectedOutcome: (gc.expectedOutcome as string).trim(),
      steps: gc.steps as string[],
    },
  };
}

// --- S3 photo validation ---

interface PhotoMetadata {
  key: string;
  contentType: AllowedPhotoContentType;
  sizeBytes: number;
}

async function validatePhoto(key: string): Promise<PhotoMetadata> {
  let contentType: string;
  let contentLength: number;
  try {
    const headResult = await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    contentType = headResult.ContentType ?? '';
    contentLength = headResult.ContentLength ?? 0;
  } catch (err) {
    throw new ValidationError(
      `Photo "${key}" could not be found or accessed in S3`,
      'photoFileIds'
    );
  }

  if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(contentType as AllowedPhotoContentType)) {
    throw new ValidationError(
      `Photo "${key}" has unsupported content type "${contentType}". Allowed types: ${ALLOWED_PHOTO_CONTENT_TYPES.join(', ')}`,
      'photoFileIds'
    );
  }

  if (contentLength > MAX_PHOTO_SIZE_BYTES) {
    throw new ValidationError(
      `Photo "${key}" size ${contentLength} bytes exceeds maximum allowed size of ${MAX_PHOTO_SIZE_BYTES} bytes (5 MB)`,
      'photoFileIds'
    );
  }

  return {
    key,
    contentType: contentType as AllowedPhotoContentType,
    sizeBytes: contentLength,
  };
}

// --- S3 photo fetch helper ---

async function fetchPhotoBytes(key: string): Promise<{ bytes: Buffer; mediaType: string } | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    const bytes = Buffer.from(await result.Body!.transformToByteArray());
    const mediaType = result.ContentType ?? 'image/jpeg';
    return { bytes, mediaType };
  } catch (err) {
    console.warn(`[ProjectSubmit] Failed to fetch photo bytes for "${key}":`, err);
    return null;
  }
}

// --- Grading prompt builder ---

function buildGradingPrompt(
  guideContext: GuideContext,
  photos: PhotoMetadata[]
): string {
  const { ideaTitle, expectedOutcome, steps } = guideContext;

  const stepsText =
    steps.length > 0
      ? steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
      : '  (no steps provided)';

  return `You are an expert evaluator for e-waste recycling projects. A user has submitted ${photos.length} photo(s) of their completed recycling project for grading. The photos are attached to this message — examine them carefully.

## Project Details

**Project Title:** ${ideaTitle}

**Expected Outcome:** ${expectedOutcome}

**Project Steps:**
${stepsText}

## Grading Instructions

Examine the attached photos and evaluate the submission based on:
- **Execution Quality**: Does the completed project match the expected outcome? Is the build quality good?
- **Completeness**: Do the photos show evidence that all key steps were followed?
- **Effort and Documentation**: Are the photos clear and well-taken? Do they show the project from multiple angles?
- **Creativity**: Any creative adaptations, improvements, or personal touches visible in the photos?

Assign a grade from A to F:
- **A (Excellent)**: Outstanding execution clearly visible in photos, project matches or exceeds expected outcome, creative touches evident
- **B (Good)**: Good execution visible, project largely matches expected outcome, solid documentation
- **C (Satisfactory)**: Acceptable execution, project partially matches expected outcome, basic photo documentation
- **D (Needs Improvement)**: Partial completion visible, significant gaps between expected and actual outcome
- **F (Participation)**: Minimal effort visible in photos, project barely started or photos don't show relevant work

You MUST respond with ONLY valid JSON (no markdown, no code blocks) in the following structure:

{
  "grade": "A",
  "feedback": "Detailed feedback explaining the grade, what was done well, and suggestions for improvement."
}

The "grade" field must be exactly one of: A, B, C, D, F
The "feedback" field must be a helpful, encouraging paragraph of 2-4 sentences referencing what you can see in the photos.

Respond with ONLY the JSON object, no other text.`;
}

// --- Response parser ---

function parseGradingResponse(rawText: string): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; feedback: string } {
  let parsed: unknown;
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse grading response: response is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Failed to parse grading response: expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  const validGrades = ['A', 'B', 'C', 'D', 'F'];
  if (typeof obj.grade !== 'string' || !validGrades.includes(obj.grade)) {
    throw new Error(
      `Invalid grade in response: "${obj.grade}". Expected one of: ${validGrades.join(', ')}`
    );
  }

  if (typeof obj.feedback !== 'string' || obj.feedback.trim() === '') {
    throw new Error('Invalid grading response: feedback must be a non-empty string');
  }

  return {
    grade: obj.grade as 'A' | 'B' | 'C' | 'D' | 'F',
    feedback: obj.feedback.trim(),
  };
}

// --- DynamoDB helpers ---

async function updateProjectSubmission(
  projectId: string,
  grade: 'A' | 'B' | 'C' | 'D' | 'F',
  points: number,
  feedback: string,
  photoKeys: string[]
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: PROJECTS_TABLE_NAME,
      Key: { projectId },
      UpdateExpression: `SET #status = :status, #submission = :submission, #updatedAt = :updatedAt`,
      ExpressionAttributeNames: {
        '#status': 'status',
        '#submission': 'submission',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':submission': {
          grade,
          points,
          feedback,
          photoKeys,
          submittedAt: now,
        },
        ':updatedAt': now,
      },
    })
  );
}

async function awardPointsToUser(userId: string, points: number): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
      UpdateExpression: `SET #points = if_not_exists(#points, :zero) + :points, #updatedAt = :updatedAt`,
      ExpressionAttributeNames: {
        '#points': 'points',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':points': points,
        ':zero': 0,
        ':updatedAt': new Date().toISOString(),
      },
    })
  );
}

// --- Response helpers ---

function errorResponse(statusCode: number, error: ErrorResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(error),
  };
}

function successResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// --- Main handler ---

/**
 * ProjectSubmitHandler - Handles POST /project/submit requests.
 *
 * Accepts a SubmitProjectRequest with projectId, photoFileIds (2-6 S3 keys),
 * and guideContext. Validates photos via S3 HeadObject, builds a grading prompt,
 * invokes Claude for AI grading, parses the grade (A-F), calculates points,
 * updates the Project record in DynamoDB, and awards points to the user.
 *
 * Handles resubmission by overwriting the previous grade/points via UpdateCommand.
 *
 * - Returns 401 if userId is not available from authorizer
 * - Returns 400 for validation errors (photo count, file type, file size)
 * - Returns 200 with SubmitProjectResponse on success
 * - Returns 500 for unexpected errors
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

    // 2. Parse request body
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(event.body || '');
    } catch {
      return errorResponse(400, {
        error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
      });
    }

    // 3. Validate request structure and photo count
    let req: SubmitProjectRequest;
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

    // 4. Validate each photo via S3 HeadObject (content type and size)
    let photos: PhotoMetadata[];
    try {
      photos = await Promise.all(req.photoFileIds.map((key) => validatePhoto(key)));
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

    // 5. Build grading prompt with photo references and expected outcome
    const prompt = buildGradingPrompt(req.guideContext, photos);

    // 5.5 Fetch actual photo bytes from S3 for multimodal AI analysis
    const photoImages: Array<{ bytes: Buffer; mediaType: string }> = [];
    for (const photo of photos) {
      const fetched = await fetchPhotoBytes(photo.key);
      if (fetched) {
        photoImages.push(fetched);
      }
    }

    // 6. Invoke model for grading — multimodal if we have images, text-only as fallback
    let rawText: string;
    try {
      if (photoImages.length > 0) {
        rawText = await bedrockClient.invokeMultimodalModel(prompt, photoImages);
      } else {
        rawText = await bedrockClient.invokeClaudeModel(prompt);
      }
    } catch (err) {
      console.error('BedrockClient invocation failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to grade project submission. Please try again.',
        },
      });
    }

    // 7. Parse grade (A-F) from response
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    let feedback: string;
    try {
      const parsed = parseGradingResponse(rawText);
      grade = parsed.grade;
      feedback = parsed.feedback;
    } catch (err) {
      console.error('Grading response parsing failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to parse grading response',
        },
      });
    }

    // 8. Calculate points via gradeToPoints
    let points: number;
    try {
      points = gradeToPoints(grade);
    } catch (err) {
      console.error('gradeToPoints failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate points for grade',
        },
      });
    }

    // 9. Update Project record: set status to 'completed', store submission result
    //    Uses UpdateCommand (not PutCommand) to handle resubmission — overwrites previous grade/points
    try {
      await updateProjectSubmission(req.projectId, grade, points, feedback, req.photoFileIds);
    } catch (err) {
      console.error('DynamoDB project update failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save submission result. Please try again.',
        },
      });
    }

    // 10. Award points to user via DynamoDB UpdateCommand (add to user's total)
    try {
      await awardPointsToUser(userId, points);
    } catch (err) {
      // Log but don't fail the request — the grade was saved successfully
      console.error('Failed to award points to user:', err);
    }

    // 11. Return SubmitProjectResponse
    const response: SubmitProjectResponse = { grade, points, feedback };

    console.log('Project submission graded successfully', {
      projectId: req.projectId,
      userId,
      grade,
      points,
      photoCount: photos.length,
    });

    return successResponse(200, response);
  } catch (err) {
    console.error('ProjectSubmitHandler unexpected error:', err);
    return errorResponse(500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};
