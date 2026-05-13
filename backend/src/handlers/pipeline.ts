import { Context } from 'aws-lambda';
import { SessionStore } from '../session-store';
import {
  PIPELINE_STAGES,
  PIPELINE_TIMEOUT_MS,
  PipelineStageConfig,
  StageKey,
  TriageSession,
} from '@resource-ai/shared';

const sessionStore = new SessionStore();

interface PipelineEvent {
  sessionId: string;
}

/**
 * Placeholder stage executor stub.
 * Will be replaced by the StageExecutor implementation in Task 7.5.
 */
async function executeStage(
  _stage: PipelineStageConfig,
  _session: TriageSession,
  _remainingTimeMs: number
): Promise<unknown> {
  return null;
}

/**
 * PipelineOrchestrator Lambda handler.
 *
 * Executes 8 pipeline stages sequentially within a 120-second total timeout budget.
 * - Receives { sessionId } in the event payload
 * - Retrieves the session from DynamoDB
 * - Loops through PIPELINE_STAGES sequentially
 * - Before each stage, checks elapsed time against PIPELINE_TIMEOUT_MS (120s)
 * - If timeout exceeded, marks session as timed out and returns
 * - After each stage completes, updates DynamoDB with the stage result
 * - On stage failure: halts execution and marks session as failed (except conceptVisual)
 * - On image generation failure (conceptVisual): stores placeholder and marks complete
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

  for (const stage of PIPELINE_STAGES) {
    const elapsed = Date.now() - startTime;

    // Check if total pipeline timeout has been exceeded
    if (elapsed >= PIPELINE_TIMEOUT_MS) {
      console.warn('Pipeline timeout exceeded', { sessionId, stage: stage.name, elapsed });
      await sessionStore.markSessionTimeout(sessionId, stage.name);
      return;
    }

    const remainingTimeMs = PIPELINE_TIMEOUT_MS - elapsed;

    try {
      const result = await executeStage(stage, session, remainingTimeMs);
      await sessionStore.updateSessionStage(sessionId, stage.key as StageKey, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle image generation failure gracefully
      if (stage.key === 'conceptVisual') {
        console.warn('Image generation failed, using placeholder', {
          sessionId,
          stage: stage.name,
          error: errorMessage,
        });
        // Store a placeholder for the concept visual and continue to mark complete
        await sessionStore.updateSessionStage(sessionId, stage.key as StageKey, {
          imageUrl: null,
          placeholder: true,
          error: errorMessage,
        });
        break; // Exit loop to mark session as complete
      }

      // For all other stages, halt execution and mark session as failed
      console.error('Stage failed', { sessionId, stage: stage.name, error: errorMessage });
      await sessionStore.markSessionFailed(sessionId, stage.name, errorMessage);
      return;
    }
  }

  // All stages completed successfully (or conceptVisual failed gracefully)
  await sessionStore.markSessionComplete(sessionId);
  console.log('Pipeline completed successfully', { sessionId });
};
