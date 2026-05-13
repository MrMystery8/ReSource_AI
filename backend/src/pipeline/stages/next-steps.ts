import {
  HazardWarning,
  NextStepsOutput,
  RiskLevel,
} from '@resource-ai/shared';
import { MAX_NEXT_STEPS_WORDS } from '@resource-ai/shared';

/**
 * Handling tier descriptions per risk level.
 * These define what actions are permitted at each risk classification.
 */
const HANDLING_TIERS: Record<RiskLevel, string> = {
  Green: 'External access and simple internal access are permitted. User may open simple enclosures and access basic internal components.',
  Yellow: 'Cautious internal access to simple parts only. User should proceed carefully with basic internal components but avoid complex assemblies.',
  Orange: 'Supervised handling only. User must not access internal components without professional supervision. Only externally accessible actions are permitted independently.',
  Red: 'External inspection only. No disassembly or internal access permitted. User must be directed to professional e-waste recovery services.',
};

/**
 * Prompt template for the Safe Next Steps and Recovery Route stage.
 *
 * Used by the PromptBuilder to construct the full prompt.
 * The Next Steps stage provides actionable recovery guidance constrained by the Safety Gate risk level.
 */
export const NEXT_STEPS_PROMPT_TEMPLATE = `You are a safe recovery route specialist for e-waste devices. Produce a Safe Next Steps and Recovery Route plan.

You MUST provide a JSON response with these fields:
- safeFirstActions: array of 3-5 ordered safe first steps the user should take
- partsToKeep: array of parts worth keeping or reusing
- partsToAvoid: array of parts the user should avoid handling
- overallRecommendation: string with the overall recommendation
- trashWarnings: array of warnings about what should NOT go in regular trash
- localRecoveryNote: string referencing e-waste recycling or certified recovery options in the user's region
- hazardWarnings: array of objects with { component, risk } identifying hazardous components from the Safety Gate and their specific risk type

HANDLING TIER CONSTRAINTS (based on Safety Gate Risk_Level):
- Green: Allow external access and simple internal access. User may open simple enclosures.
- Yellow: Allow cautious internal access to simple parts only. Avoid complex assemblies.
- Orange: Supervised handling only. No independent internal access. Only external actions permitted.
- Red: External inspection only. NO disassembly. NO internal access. Direct user to professional e-waste recovery services.

IMPORTANT CONSTRAINTS:
- Total response must be 300 words or fewer.
- safeFirstActions must contain exactly 3-5 ordered steps.
- All recommended actions MUST comply with the handling tier for the current Risk_Level.
- hazardWarnings MUST reference components identified in the Safety Gate hazard list.
- Each hazard warning must state the specific risk type (e.g., chemical exposure, electrical shock, sharp edges).
- If Risk_Level is Red: EXCLUDE any steps involving opening the device or accessing internal components. Direct user to professional services.`;

/**
 * Counts the number of words in a string.
 * Words are defined as sequences of non-whitespace characters separated by whitespace.
 */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/**
 * Truncates text to a maximum word count, preserving whole words.
 */
function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(' ');
}

/**
 * Calculates the total word count of a NextStepsOutput.
 * Counts words across all text fields and array entries.
 */
function calculateTotalWordCount(output: NextStepsOutput): number {
  let total = 0;

  for (const action of output.safeFirstActions) {
    total += countWords(action);
  }
  for (const part of output.partsToKeep) {
    total += countWords(part);
  }
  for (const part of output.partsToAvoid) {
    total += countWords(part);
  }
  total += countWords(output.overallRecommendation);
  for (const warning of output.trashWarnings) {
    total += countWords(warning);
  }
  total += countWords(output.localRecoveryNote);
  for (const hw of output.hazardWarnings) {
    total += countWords(hw.component);
    total += countWords(hw.risk);
  }

  return total;
}

/**
 * Normalizes a value into an array of non-empty strings.
 * Returns an empty array if the value is not an array.
 */
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

/**
 * Validates a single hazard warning entry from the raw response.
 *
 * @param entry - The raw hazard warning object
 * @param index - The index in the array (for error messages)
 * @returns A validated HazardWarning or null if invalid
 */
function validateHazardWarningEntry(entry: unknown, index: number): HazardWarning | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const obj = entry as Record<string, unknown>;

  if (typeof obj.component !== 'string' || obj.component.trim() === '') {
    return null;
  }

  if (typeof obj.risk !== 'string' || obj.risk.trim() === '') {
    return null;
  }

  return {
    component: obj.component.trim(),
    risk: obj.risk.trim(),
  };
}

/**
 * Validates and normalizes raw parsed JSON into a NextStepsOutput structure.
 *
 * Applies the following validation and transformation rules:
 * - safeFirstActions must be an array of 3-5 non-empty strings
 * - partsToKeep must be an array of strings
 * - partsToAvoid must be an array of strings
 * - overallRecommendation must be a non-empty string
 * - trashWarnings must be an array of strings
 * - localRecoveryNote must be a non-empty string
 * - hazardWarnings must be an array of {component, risk} objects
 * - Total word count must be ≤ 300 (truncate overallRecommendation if needed)
 * - Hazard warnings should reference Safety Gate hazard list components
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param riskLevel - The risk level from the Safety Gate stage
 * @param safetyGateHazards - Optional list of hazards identified by the Safety Gate
 * @returns A validated NextStepsOutput
 * @throws Error if the raw output does not conform to the expected structure
 */
export function validateNextStepsOutput(
  raw: unknown,
  riskLevel: RiskLevel,
  safetyGateHazards?: string[],
): NextStepsOutput {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new Error('Next Steps output must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate safeFirstActions - must be array of 3-5 non-empty strings
  const safeFirstActions = normalizeStringArray(obj.safeFirstActions);
  if (safeFirstActions.length < 3 || safeFirstActions.length > 5) {
    throw new Error(
      `Next Steps safeFirstActions must contain 3-5 items. Got: ${safeFirstActions.length}`,
    );
  }

  // Validate partsToKeep - must be array of strings
  const partsToKeep = normalizeStringArray(obj.partsToKeep);

  // Validate partsToAvoid - must be array of strings
  const partsToAvoid = normalizeStringArray(obj.partsToAvoid);

  // Validate overallRecommendation - must be non-empty string
  if (typeof obj.overallRecommendation !== 'string' || obj.overallRecommendation.trim() === '') {
    throw new Error('Next Steps output must include a non-empty overallRecommendation string');
  }
  let overallRecommendation = obj.overallRecommendation.trim();

  // Validate trashWarnings - must be array of strings
  const trashWarnings = normalizeStringArray(obj.trashWarnings);

  // Validate localRecoveryNote - must be non-empty string
  if (typeof obj.localRecoveryNote !== 'string' || obj.localRecoveryNote.trim() === '') {
    throw new Error('Next Steps output must include a non-empty localRecoveryNote string');
  }
  const localRecoveryNote = obj.localRecoveryNote.trim();

  // Validate hazardWarnings - must be array of {component, risk} objects
  let hazardWarnings: HazardWarning[] = [];
  if (Array.isArray(obj.hazardWarnings)) {
    hazardWarnings = obj.hazardWarnings
      .map((entry, index) => validateHazardWarningEntry(entry, index))
      .filter((hw): hw is HazardWarning => hw !== null);
  }

  // If safetyGateHazards are provided and no hazard warnings were generated,
  // create default hazard warnings from the Safety Gate hazard list
  if (hazardWarnings.length === 0 && safetyGateHazards && safetyGateHazards.length > 0) {
    hazardWarnings = safetyGateHazards.map((hazard) => ({
      component: hazard,
      risk: 'Identified hazard from Safety Gate assessment',
    }));
  }

  // Build the output
  const output: NextStepsOutput = {
    safeFirstActions,
    partsToKeep,
    partsToAvoid,
    overallRecommendation,
    trashWarnings,
    localRecoveryNote,
    hazardWarnings,
  };

  // Enforce total word count limit (Requirement 9.2: max 300 words)
  // If total exceeds limit, truncate overallRecommendation
  const totalWords = calculateTotalWordCount(output);
  if (totalWords > MAX_NEXT_STEPS_WORDS) {
    const excessWords = totalWords - MAX_NEXT_STEPS_WORDS;
    const recommendationWords = countWords(overallRecommendation);
    const newWordCount = Math.max(1, recommendationWords - excessWords);
    output.overallRecommendation = truncateToWordLimit(overallRecommendation, newWordCount);
  }

  return output;
}
