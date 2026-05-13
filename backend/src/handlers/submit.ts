import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { validateCreateSessionRequest, ValidationError } from '../validator';
import { sanitize, validateInputLength } from '../sanitizer';
import { SessionStore } from '../session-store';
import { ErrorResponse, TriageInputs } from '@resource-ai/shared';

const PIPELINE_FUNCTION_NAME = process.env.PIPELINE_FUNCTION_NAME!;

const lambdaClient = new LambdaClient({});
const sessionStore = new SessionStore();

/**
 * SubmitHandler - Creates a new triage session and triggers the pipeline asynchronously.
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Validate input lengths (5000 char max)
 * 3. Sanitize text inputs
 * 4. Create session in DynamoDB
 * 5. Invoke PipelineOrchestrator Lambda asynchronously
 * 6. Return 201 with sessionId
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
  };

  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '');
    } catch {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be valid JSON',
        },
      };
      return { statusCode: 400, headers, body: JSON.stringify(errorResponse) };
    }

    // 2. Validate request schema (required fields, types, lengths)
    let validated;
    try {
      validated = validateCreateSessionRequest(body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return { statusCode: 400, headers, body: JSON.stringify(err.toErrorResponse()) };
      }
      throw err;
    }

    // 3. Validate input lengths (5000 char max per field)
    const textFields: Array<{ name: string; value: string }> = [
      { name: 'deviceIdentity', value: validated.deviceIdentity },
      { name: 'failureSymptoms', value: validated.failureSymptoms },
      { name: 'userContext', value: validated.userContext },
    ];

    for (const field of textFields) {
      try {
        validateInputLength(field.value);
      } catch {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: `${field.name} exceeds maximum allowed length of 5000 characters`,
            field: field.name,
          },
        };
        return { statusCode: 400, headers, body: JSON.stringify(errorResponse) };
      }
    }

    // 4. Sanitize text inputs
    const sanitizedDeviceIdentity = sanitize(validated.deviceIdentity);
    const sanitizedFailureSymptoms = sanitize(validated.failureSymptoms);
    const sanitizedUserContext = sanitize(validated.userContext);

    // 5. Create session in DynamoDB
    const inputs: TriageInputs = {
      deviceIdentity: sanitizedDeviceIdentity,
      failureSymptoms: sanitizedFailureSymptoms,
      userContext: sanitizedUserContext,
      fileIds: validated.fileIds ?? [],
    };

    const sessionId = await sessionStore.createSession(inputs);

    // 6. Invoke PipelineOrchestrator Lambda asynchronously
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: PIPELINE_FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({ sessionId })),
      })
    );

    // 7. Return 201 with sessionId
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ sessionId }),
    };
  } catch (err) {
    console.error('SubmitHandler unexpected error:', err);
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing the request',
      },
    };
    return { statusCode: 500, headers, body: JSON.stringify(errorResponse) };
  }
};
