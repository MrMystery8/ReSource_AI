import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
  TriageSession,
  TriageInputs,
  StageKey,
  SessionError,
} from '@resource-ai/shared';
import {
  SESSION_TTL_HOURS,
  DYNAMODB_RETRY_DELAYS_MS,
  DYNAMODB_MAX_RETRIES,
} from '@resource-ai/shared';

const TABLE_NAME = process.env.TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export class SessionStore {
  /**
   * Creates a new triage session with status 'processing' and 24-hour TTL.
   * Returns the generated session ID.
   */
  async createSession(inputs: TriageInputs, userId?: string): Promise<string> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = Math.floor(now.getTime() / 1000) + SESSION_TTL_HOURS * 3600;

    const session: TriageSession = {
      sessionId,
      status: 'processing',
      currentStage: null,
      createdAt: now.toISOString(),
      expiresAt,
      inputs,
      stages: {
        quickVerdict: null,
        safetyGate: null,
        detailedAnalysis: null,
        secondLifeIdeas: null,
        nextSteps: null,
        conceptVisual: null,
      },
      error: null,
      ...(userId && { userId }),
    };

    await this.retryWrite(() =>
      docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: session,
        })
      )
    );

    return sessionId;
  }

  /**
   * Retrieves a session by ID. Returns null if not found.
   */
  async getSession(sessionId: string): Promise<TriageSession | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { sessionId },
      })
    );

    return (result.Item as TriageSession) ?? null;
  }

  /**
   * Atomically updates a single stage output and sets currentStage to the next stage.
   */
  async updateSessionStage(
    sessionId: string,
    stageKey: StageKey,
    output: unknown
  ): Promise<void> {
    await this.retryWrite(() =>
      docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { sessionId },
          UpdateExpression:
            'SET stages.#stageKey = :output, currentStage = :stageKey',
          ExpressionAttributeNames: {
            '#stageKey': stageKey,
          },
          ExpressionAttributeValues: {
            ':output': output,
            ':stageKey': stageKey,
          },
        })
      )
    );
  }

  /**
   * Marks a session as complete with no current stage.
   */
  async markSessionComplete(sessionId: string): Promise<void> {
    await this.retryWrite(() =>
      docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { sessionId },
          UpdateExpression: 'SET #status = :status, currentStage = :nullVal',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'complete',
            ':nullVal': null,
          },
        })
      )
    );
  }

  /**
   * Marks a session as failed with error details.
   */
  async markSessionFailed(
    sessionId: string,
    stage: string,
    message: string
  ): Promise<void> {
    const error: SessionError = { stage, message };

    await this.retryWrite(() =>
      docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { sessionId },
          UpdateExpression:
            'SET #status = :status, currentStage = :nullVal, #error = :error',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#error': 'error',
          },
          ExpressionAttributeValues: {
            ':status': 'failed',
            ':nullVal': null,
            ':error': error,
          },
        })
      )
    );
  }

  /**
   * Marks a session as failed due to timeout at a specific stage.
   */
  async markSessionTimeout(sessionId: string, stage: string): Promise<void> {
    await this.markSessionFailed(sessionId, stage, 'Pipeline timeout exceeded');
  }

  /**
   * Retries a DynamoDB write operation up to DYNAMODB_MAX_RETRIES times
   * with exponential backoff (100ms, 200ms, 400ms).
   */
  private async retryWrite(operation: () => Promise<unknown>): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= DYNAMODB_MAX_RETRIES; attempt++) {
      try {
        await operation();
        return;
      } catch (err) {
        lastError = err;
        if (attempt < DYNAMODB_MAX_RETRIES) {
          const delay = DYNAMODB_RETRY_DELAYS_MS[attempt];
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
