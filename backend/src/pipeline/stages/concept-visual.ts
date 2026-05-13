import {
  ConceptVisualOutput,
  RiskLevel,
  SafetyGateOutput,
  TriageSession,
} from '@resource-ai/shared';
import { BedrockClient } from '../../bedrock-client';
import { FileStore } from '../../file-store';

/**
 * Builds an image generation prompt based on the Safety Gate risk level.
 *
 * - Green/Yellow/Orange: depicts the safest second-life project from prior stage output
 * - Red: depicts a professional recovery/recycling concept
 *
 * @param session - The current triage session
 * @param riskLevel - The risk level from the Safety Gate
 * @param accumulatedOutputs - All outputs from prior stages
 * @returns The image generation prompt string
 */
export function buildImagePrompt(
  session: TriageSession,
  riskLevel: RiskLevel,
  accumulatedOutputs: Record<string, unknown>,
): string {
  const deviceIdentity = session.inputs.deviceIdentity;

  if (riskLevel === 'Red') {
    return `Create a clean, professional illustration of a certified e-waste recovery and recycling facility processing a ${deviceIdentity}. Show proper safety equipment, professional handling, and responsible recycling. The image should convey safety, professionalism, and environmental responsibility. Style: modern, informative, reassuring. No text overlays.`;
  }

  // For Green, Yellow, Orange: depict the safest second-life project
  const secondLifeIdeas = accumulatedOutputs['secondLifeIdeas'] as
    | { ideas?: Array<{ title?: string; description?: string }> }
    | undefined;
  const bestIdea = secondLifeIdeas?.ideas?.[0];
  const ideaDescription = bestIdea
    ? `${bestIdea.title}: ${bestIdea.description}`
    : `a creative reuse project using components from a ${deviceIdentity}`;

  return `Create a bright, inspiring illustration of a DIY maker project: ${ideaDescription}. Show the project in a safe, well-lit workspace with appropriate tools. The image should convey creativity, safety, and sustainability. Style: modern, colorful, encouraging. No text overlays.`;
}

/**
 * Extracts the risk level from accumulated outputs (Safety Gate stage).
 * Defaults to 'Red' if the Safety Gate output is missing (conservative approach).
 */
function extractRiskLevel(accumulatedOutputs: Record<string, unknown>): RiskLevel {
  const safetyGate = accumulatedOutputs['safetyGate'] as SafetyGateOutput | undefined;
  if (safetyGate?.riskLevel) {
    return safetyGate.riskLevel;
  }
  return 'Red';
}

/**
 * Executes the Concept Visual stage of the triage pipeline.
 *
 * This stage:
 * 1. Extracts the risk level from accumulated outputs (Safety Gate)
 * 2. Builds an image generation prompt based on risk level
 * 3. Calls bedrockClient.invokeImageModel to generate the image
 * 4. Stores the generated image in S3 via fileStore
 * 5. Returns the S3 key as the imageUrl
 *
 * If image generation fails for any reason, returns { imageUrl: '' } as a
 * placeholder rather than failing the entire session (Requirement 11.5).
 *
 * @param session - The current triage session
 * @param accumulatedOutputs - Outputs from all previously completed stages
 * @param bedrockClient - The Bedrock client for image generation
 * @param fileStore - The file store for persisting the generated image
 * @returns ConceptVisualOutput with imageUrl (S3 key or empty string on failure)
 */
export async function executeConceptVisualStage(
  session: TriageSession,
  accumulatedOutputs: Record<string, unknown>,
  bedrockClient: BedrockClient,
  fileStore: FileStore,
): Promise<ConceptVisualOutput> {
  try {
    const riskLevel = extractRiskLevel(accumulatedOutputs);
    const prompt = buildImagePrompt(session, riskLevel, accumulatedOutputs);
    const imageBuffer = await bedrockClient.invokeImageModel(prompt);
    const s3Key = await fileStore.storeGeneratedImage(session.sessionId, imageBuffer);
    return { imageUrl: s3Key };
  } catch {
    // Image generation failure should not fail the session (Requirement 11.5)
    return { imageUrl: '' };
  }
}
