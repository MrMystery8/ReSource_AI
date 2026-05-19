import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
  ErrorResponse,
  StructuredUserContext,
  ImplementationGuide,
  InstructionStep,
  Project,
} from '@resource-ai/shared';
import { BedrockClient } from '../bedrock-client';
import { UserStore } from '../auth/user-store';
import { resolveAuthenticatedUserId } from '../auth/request-identity';

const PROJECTS_TABLE_NAME = process.env.PROJECTS_TABLE_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockClient();
const userStore = new UserStore();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

// --- Request / Response interfaces ---

interface GenerateGuideRequest {
  ideaTitle: string;
  ideaDescription: string;
  requiredComponents: string[];
  additionalMaterials: string[];
  userContext: StructuredUserContext;
  sessionId: string;
}

interface GenerateGuideResponse {
  guide: ImplementationGuide;
  projectId: string;
}

// --- Validation helpers ---

function isStructuredUserContext(value: unknown): value is StructuredUserContext {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const validExpertise = ['Beginner', 'Intermediate', 'Expert'];
  const validMotivation = [
    'Learn Something New',
    'Environmental Impact',
    'Save Money',
    'Creative Project',
  ];
  const validMaterial = [
    'Basic Household Tools',
    'Some Electronics Tools',
    'Full Workshop',
  ];
  const validTime = ['Under 1 Hour', '1-3 Hours', 'Half Day', 'Multi-Day Project'];

  return (
    typeof v.expertiseLevel === 'string' &&
    validExpertise.includes(v.expertiseLevel) &&
    typeof v.motivation === 'string' &&
    validMotivation.includes(v.motivation) &&
    typeof v.materialAvailability === 'string' &&
    validMaterial.includes(v.materialAvailability) &&
    typeof v.timeCommitment === 'string' &&
    validTime.includes(v.timeCommitment)
  );
}

function validateRequest(body: unknown): GenerateGuideRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const b = body as Record<string, unknown>;

  if (typeof b.ideaTitle !== 'string' || b.ideaTitle.trim() === '') {
    throw new ValidationError('ideaTitle is required', 'ideaTitle');
  }
  if (typeof b.ideaDescription !== 'string' || b.ideaDescription.trim() === '') {
    throw new ValidationError('ideaDescription is required', 'ideaDescription');
  }
  if (!Array.isArray(b.requiredComponents) || b.requiredComponents.some((c) => typeof c !== 'string')) {
    throw new ValidationError('requiredComponents must be an array of strings', 'requiredComponents');
  }
  if (!Array.isArray(b.additionalMaterials) || b.additionalMaterials.some((m) => typeof m !== 'string')) {
    throw new ValidationError('additionalMaterials must be an array of strings', 'additionalMaterials');
  }
  if (!isStructuredUserContext(b.userContext)) {
    throw new ValidationError('userContext must be a valid StructuredUserContext', 'userContext');
  }
  if (typeof b.sessionId !== 'string' || b.sessionId.trim() === '') {
    throw new ValidationError('sessionId is required', 'sessionId');
  }

  return {
    ideaTitle: (b.ideaTitle as string).trim(),
    ideaDescription: (b.ideaDescription as string).trim(),
    requiredComponents: b.requiredComponents as string[],
    additionalMaterials: b.additionalMaterials as string[],
    userContext: b.userContext as StructuredUserContext,
    sessionId: (b.sessionId as string).trim(),
  };
}

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// --- Prompt builder ---

function buildGuidePrompt(req: GenerateGuideRequest): string {
  const { ideaTitle, ideaDescription, requiredComponents, additionalMaterials, userContext } = req;
  const { expertiseLevel, motivation, materialAvailability, timeCommitment } = userContext;

  const expertiseInstructions: Record<string, string> = {
    Beginner:
      'The user is a BEGINNER. For each step, include an "explanation" field that explains any technical terms, tool usage, and why the step is performed. Use simple, encouraging language.',
    Intermediate:
      'The user is INTERMEDIATE. Assume familiarity with basic tools and techniques. No need to explain common terms, but clarify any advanced concepts.',
    Expert:
      'The user is an EXPERT. Use concise technical language. Skip introductory explanations and assume full familiarity with tools and techniques.',
  };

  const expertiseInstruction = expertiseInstructions[expertiseLevel] ?? expertiseInstructions['Intermediate'];

  return `You are an expert e-waste recycling guide generator. Generate a detailed implementation guide for the following recycling project.

PROJECT DETAILS:
- Title: ${ideaTitle}
- Description: ${ideaDescription}
- Required Components: ${requiredComponents.join(', ') || 'None specified'}
- Additional Materials: ${additionalMaterials.join(', ') || 'None specified'}

USER CONTEXT:
- Expertise Level: ${expertiseLevel}
- Motivation: ${motivation}
- Available Tools/Materials: ${materialAvailability}
- Time Available: ${timeCommitment}

INSTRUCTIONS FOR TAILORING:
${expertiseInstruction}

Generate a comprehensive implementation guide. You MUST respond with ONLY valid JSON (no markdown, no code blocks) in the following structure:

{
  "materials": ["material1", "material2", ...],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Step instruction text",
      "explanation": "Optional explanation (include for Beginner level)"
    }
  ],
  "estimatedTime": "e.g., 2-3 hours",
  "safetyWarnings": ["warning1", "warning2"]
}

REQUIREMENTS:
- materials: between 3 and 15 items (list all tools and materials needed)
- steps: between 5 and 20 numbered steps
- estimatedTime: a specific range in minutes or hours
- safetyWarnings: at least one safety warning per hazardous component, or ["No specific safety concerns"] if none apply
- For Beginner level: include "explanation" field in every step
- For Intermediate/Expert level: "explanation" field is optional, omit unless truly necessary

Respond with ONLY the JSON object, no other text.`;
}

// --- Response parser ---

function parseGuideResponse(rawText: string): ImplementationGuide {
  let parsed: unknown;
  try {
    // Strip any accidental markdown code fences
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse implementation guide: response is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Failed to parse implementation guide: expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  // Validate materials
  if (!Array.isArray(obj.materials) || obj.materials.some((m) => typeof m !== 'string')) {
    throw new Error('Invalid guide response: materials must be an array of strings');
  }
  const materials: string[] = obj.materials as string[];
  if (materials.length < 3 || materials.length > 15) {
    throw new Error(
      `Invalid guide response: materials count ${materials.length} is outside the required range of 3-15`
    );
  }

  // Validate steps
  if (!Array.isArray(obj.steps)) {
    throw new Error('Invalid guide response: steps must be an array');
  }
  const steps: InstructionStep[] = (obj.steps as unknown[]).map((s, i) => {
    if (typeof s !== 'object' || s === null) {
      throw new Error(`Invalid guide response: step ${i + 1} is not an object`);
    }
    const step = s as Record<string, unknown>;
    if (typeof step.stepNumber !== 'number') {
      throw new Error(`Invalid guide response: step ${i + 1} missing stepNumber`);
    }
    if (typeof step.instruction !== 'string' || step.instruction.trim() === '') {
      throw new Error(`Invalid guide response: step ${i + 1} missing instruction`);
    }
    const result: InstructionStep = {
      stepNumber: step.stepNumber as number,
      instruction: step.instruction as string,
    };
    if (typeof step.explanation === 'string' && step.explanation.trim() !== '') {
      result.explanation = step.explanation;
    }
    return result;
  });

  if (steps.length < 5 || steps.length > 20) {
    throw new Error(
      `Invalid guide response: steps count ${steps.length} is outside the required range of 5-20`
    );
  }

  // Validate estimatedTime
  if (typeof obj.estimatedTime !== 'string' || obj.estimatedTime.trim() === '') {
    throw new Error('Invalid guide response: estimatedTime must be a non-empty string');
  }

  // Validate safetyWarnings
  if (
    !Array.isArray(obj.safetyWarnings) ||
    obj.safetyWarnings.some((w) => typeof w !== 'string')
  ) {
    throw new Error('Invalid guide response: safetyWarnings must be an array of strings');
  }

  return {
    materials,
    steps,
    estimatedTime: obj.estimatedTime as string,
    safetyWarnings: obj.safetyWarnings as string[],
  };
}

// --- DynamoDB helpers ---

async function createProjectRecord(
  userId: string,
  req: GenerateGuideRequest,
  guide: ImplementationGuide
): Promise<string> {
  const projectId = uuidv4();
  const now = new Date().toISOString();

  const project: Project = {
    projectId,
    userId,
    sessionId: req.sessionId,
    ideaTitle: req.ideaTitle,
    ideaDescription: req.ideaDescription,
    requiredComponents: req.requiredComponents,
    additionalMaterials: req.additionalMaterials,
    userContext: req.userContext,
    status: 'in-progress',
    guide,
    startedAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: PROJECTS_TABLE_NAME,
      Item: project,
    })
  );

  return projectId;
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
 * GuideGenerateHandler - Generates a detailed implementation guide for a recycling project.
 *
 * POST /guide/generate
 * - Requires authenticated user (userId from Lambda authorizer)
 * - Accepts GenerateGuideRequest body
 * - Builds a tailored prompt based on user expertise level
 * - Invokes Claude via BedrockClient
 * - Parses and validates the response (3-15 materials, 5-20 steps)
 * - Creates a Project record in DynamoDB with status 'in-progress'
 * - Returns GenerateGuideResponse with the guide
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract userId from Lambda authorizer context
    const userId = await resolveAuthenticatedUserId(event, userStore);

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

    // 3. Validate request
    let req: GenerateGuideRequest;
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

    // 4. Build prompt tailored to user expertise level
    const prompt = buildGuidePrompt(req);

    // 5. Invoke Claude via BedrockClient
    let rawText: string;
    try {
      rawText = await bedrockClient.invokeClaudeModel(prompt);
    } catch (err) {
      console.error('BedrockClient invocation failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate implementation guide. Please try again.',
        },
      });
    }

    // 6. Parse response into ImplementationGuide and validate bounds
    let guide: ImplementationGuide;
    try {
      guide = parseGuideResponse(rawText);
    } catch (err) {
      console.error('Guide response parsing failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to parse implementation guide response',
        },
      });
    }

    // 7. Create Project record in DynamoDB with status 'in-progress' and cache guide
    let projectId: string;
    try {
      projectId = await createProjectRecord(userId, req, guide);
    } catch (err) {
      console.error('DynamoDB write failed:', err);
      return errorResponse(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save project record. Please try again.',
        },
      });
    }

    // 8. Return GenerateGuideResponse
    const response: GenerateGuideResponse = { guide, projectId };
    console.log('Guide generated successfully', {
      projectId,
      userId,
      ideaTitle: req.ideaTitle,
      materialsCount: guide.materials.length,
      stepsCount: guide.steps.length,
    });

    return successResponse(200, response);
  } catch (err) {
    console.error('GuideGenerateHandler unexpected error:', err);
    return errorResponse(500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};
