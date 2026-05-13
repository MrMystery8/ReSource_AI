import { Context } from 'aws-lambda';
import { SessionStore } from '../session-store';
import { StageExecutor } from '../pipeline/stage-executor';
import { PromptBuilder } from '../pipeline/prompt-builder';
import { BedrockClient } from '../bedrock-client';
import { processSessionCompletion } from '../gamification/gamification-service';
import {
  PIPELINE_STAGES,
  PIPELINE_TIMEOUT_MS,
  StageKey,
} from '@resource-ai/shared';

const sessionStore = new SessionStore();
const bedrockClient = new BedrockClient();
const promptBuilder = new PromptBuilder();
const stageExecutor = new StageExecutor(bedrockClient, promptBuilder);

interface PipelineEvent {
  sessionId: string;
}

/**
 * PipelineOrchestrator Lambda handler.
 *
 * Executes 7 text pipeline stages sequentially within a 120-second total timeout budget.
 * - Receives { sessionId } in the event payload
 * - Retrieves the session from DynamoDB
 * - Loops through PIPELINE_STAGES sequentially
 * - Before each stage, checks elapsed time against PIPELINE_TIMEOUT_MS (120s)
 * - If timeout exceeded, marks session as timed out and returns
 * - After each stage completes, updates DynamoDB with the stage result
 * - On stage failure: halts execution and marks session as failed
 * - On successful completion of all stages: marks session as complete
 */
export const handler = async (event: PipelineEvent, context: Context): Promise<void> => {
  const { sessionId } = event;
  console.log('PipelineOrchestrator invoked', { sessionId, requestId: context.awsRequestId });

  // Retrieve session from DynamoDB
  const session = await sessionStore.getSession(sessionId);
  if (!session) {
    console.error('Session not found', { sessionId });
    return;
  }

  const startTime = Date.now();
  const accumulatedOutputs: Record<string, unknown> = {};

  for (const stage of PIPELINE_STAGES) {
    const elapsed = Date.now() - startTime;

    // Check if total pipeline timeout has been exceeded
    if (elapsed >= PIPELINE_TIMEOUT_MS) {
      console.warn('Pipeline timeout exceeded', { sessionId, stage: stage.name, elapsed });
      await sessionStore.markSessionTimeout(sessionId, stage.name);
      return;
    }

    try {
      const result = await stageExecutor.execute(stage, session, accumulatedOutputs);
      accumulatedOutputs[stage.key] = result;
      await sessionStore.updateSessionStage(sessionId, stage.key as StageKey, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Stage failed', { sessionId, stage: stage.name, error: errorMessage });
      await sessionStore.markSessionFailed(sessionId, stage.name, errorMessage);
      return;
    }
  }

  // All stages completed successfully
  await sessionStore.markSessionComplete(sessionId);
  console.log('Pipeline completed successfully', { sessionId });

  // Trigger gamification — award points, update streak, check badges
  if (session.userId) {
    try {
      const gamificationResult = await processSessionCompletion(session.userId, session);
      console.log('Gamification processed', {
        sessionId,
        userId: session.userId,
        pointsEarned: gamificationResult.pointsEarned.total,
        newBadges: gamificationResult.newBadges,
        newLevel: gamificationResult.newLevel,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Gamification processing failed (non-fatal)', {
        sessionId,
        userId: session.userId,
        error: errorMessage,
      });
    }
  }
};
