import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockClient } from '../bedrock-client';
import { ErrorResponse } from '@resource-ai/shared';

const bedrockClient = new BedrockClient();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 50;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ProjectContext {
  ideaTitle: string;
  materials: string[];
  steps: string[];
  deviceInfo: string;
}

interface ChatRequest {
  message: string;
  projectContext: ProjectContext;
  conversationHistory: ChatMessage[];
}

interface ChatResponse {
  reply: string;
}

/**
 * GuideChatHandler - Handles POST /guide/chat requests.
 *
 * Accepts a user message and project context, builds a scoped prompt,
 * invokes Claude via BedrockClient, and returns the AI reply.
 *
 * - Returns 400 if message exceeds 500 characters
 * - Returns 400 if request body is invalid JSON or missing required fields
 * - Returns 200 with ChatResponse on success
 * - Returns 500 for unexpected errors
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    // 2. Validate required fields
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).message !== 'string' ||
      typeof (body as Record<string, unknown>).projectContext !== 'object' ||
      !Array.isArray((body as Record<string, unknown>).conversationHistory)
    ) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request must include message (string), projectContext (object), and conversationHistory (array)',
        },
      };
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    const request = body as ChatRequest;

    // 3. Validate message length ≤ 500 characters
    if (request.message.length > MAX_MESSAGE_LENGTH) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters`,
          field: 'message',
        },
      };
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    // 4. Validate projectContext fields
    const ctx = request.projectContext;
    if (
      typeof ctx.ideaTitle !== 'string' ||
      !Array.isArray(ctx.materials) ||
      !Array.isArray(ctx.steps) ||
      typeof ctx.deviceInfo !== 'string'
    ) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectContext must include ideaTitle (string), materials (array), steps (array), and deviceInfo (string)',
        },
      };
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
    }

    // 5. Cap conversation history to the most recent MAX_HISTORY_MESSAGES messages
    const history = request.conversationHistory.slice(-MAX_HISTORY_MESSAGES);

    // 6. Build scoped prompt
    const prompt = buildScopedPrompt(request.message, request.projectContext, history);

    // 7. Invoke Claude via BedrockClient
    const reply = await bedrockClient.invokeTextModel(prompt);

    // 8. Return ChatResponse
    const response: ChatResponse = { reply };
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('GuideChatHandler error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing the chat request',
      },
    };
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify(errorResponse) };
  }
};

/**
 * Builds a scoped prompt for the chatbot that includes all project context fields
 * and conversation history, instructing Claude to only answer questions about
 * the current recycling project.
 */
function buildScopedPrompt(
  userMessage: string,
  projectContext: ProjectContext,
  conversationHistory: ChatMessage[]
): string {
  const { ideaTitle, materials, steps, deviceInfo } = projectContext;

  const materialsText = materials.length > 0
    ? materials.map((m, i) => `  ${i + 1}. ${m}`).join('\n')
    : '  (none listed)';

  const stepsText = steps.length > 0
    ? steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
    : '  (none listed)';

  const historyText = conversationHistory.length > 0
    ? conversationHistory
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n')
    : '(no prior conversation)';

  return `You are a helpful assistant for a recycling project. Your role is STRICTLY LIMITED to answering questions about the specific recycling project described below. Do NOT answer questions unrelated to this project. If the user asks about anything outside the scope of this project, politely decline and suggest they rephrase their question to relate to the current project.

## Current Recycling Project

**Project Title:** ${ideaTitle}

**Device Being Recycled:** ${deviceInfo}

**Required Materials and Tools:**
${materialsText}

**Project Steps:**
${stepsText}

## Conversation History
${historyText}

## User's Current Message
User: ${userMessage}

Please respond helpfully and concisely, staying strictly within the scope of the current recycling project described above.`;
}
