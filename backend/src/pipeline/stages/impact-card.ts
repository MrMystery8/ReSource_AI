import { ImpactCardOutput, RiskLevel } from '@resource-ai/shared';
import {
  MAX_IMPACT_CARD_TOTAL_WORDS,
  MAX_IMPACT_CARD_FIELD_WORDS,
} from '@resource-ai/shared';

/**
 * The 11 required fields for the ReSource Impact Card.
 */
const IMPACT_CARD_FIELDS: ReadonlyArray<keyof ImpactCardOutput> = [
  'deviceName',
  'riskLevel',
  'salvageScore',
  'topReusablePart',
  'bestSecondLifeIdea',
  'skillLevelRequired',
  'safetyWarning',
  'recommendedAction',
  'environmentalImpactNote',
  'recoveryDifficulty',
  'overallVerdict',
] as const;

/**
 * Phrases that indicate internal access recommendations.
 * Used to detect non-compliant recommendedAction values for Red risk level.
 */
const INTERNAL_ACCESS_PHRASES: ReadonlyArray<string> = [
  'open the device',
  'open the case',
  'open the enclosure',
  'disassemble',
  'internal component',
  'internal access',
  'open it up',
  'take apart',
  'remove internal',
  'access internal',
];

/**
 * Prompt template for the ReSource Impact Card stage.
 *
 * Used by the PromptBuilder to construct the full prompt.
 * The Impact Card summarizes the entire triage into a concise card format.
 */
export const IMPACT_CARD_PROMPT_TEMPLATE = `You are a summary specialist for e-waste triage. Produce a concise ReSource Impact Card summarizing the entire triage.

You MUST provide a JSON response with exactly these 11 fields:
- deviceName: name of the device
- riskLevel: the risk classification (Green/Yellow/Orange/Red)
- salvageScore: salvage potential rating
- topReusablePart: the most valuable reusable component
- bestSecondLifeIdea: the recommended second-life project
- skillLevelRequired: skill level needed for recovery
- safetyWarning: key safety concern
- recommendedAction: what the user should do next
- environmentalImpactNote: environmental consideration
- recoveryDifficulty: how difficult recovery is
- overallVerdict: final recommendation

IMPORTANT CONSTRAINTS:
- Total word count across ALL field values must be 120 words or fewer.
- Each individual field value must be 15 words or fewer.
- If Risk_Level is Red: the recommendedAction MUST reflect professional recovery (e.g., "Take to certified e-waste recycler" or "Seek professional recovery service"). Do NOT recommend opening the device or accessing internal components.`;

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
  if (maxWords <= 0) {
    return '';
  }
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(' ');
}

/**
 * Checks whether a recommendedAction string contains internal access language.
 */
function containsInternalAccessLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return INTERNAL_ACCESS_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Default professional recovery recommendation for Red risk level.
 */
const RED_RISK_DEFAULT_ACTION = 'Take to certified e-waste recycler for professional recovery';

/**
 * Validates and normalizes raw parsed JSON into an ImpactCardOutput structure.
 *
 * Applies the following validation and transformation rules:
 * - All 11 fields must be present and be strings
 * - Each field value is truncated to ≤ 15 words (MAX_IMPACT_CARD_FIELD_WORDS)
 * - Total word count across all field values is ≤ 120 (MAX_IMPACT_CARD_TOTAL_WORDS)
 *   If exceeded, the longest fields are truncated to bring total within limit
 * - If riskLevel is Red: recommendedAction must reflect professional recovery,
 *   not internal access (Requirement 10.4)
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param riskLevel - The risk level from the Safety Gate stage
 * @returns A validated ImpactCardOutput
 * @throws Error if the raw output does not conform to the expected structure
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
export function validateImpactCardOutput(
  raw: unknown,
  riskLevel: RiskLevel,
): ImpactCardOutput {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new Error('Impact Card output must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate all 11 fields are present and are strings
  const result: Record<string, string> = {};
  for (const field of IMPACT_CARD_FIELDS) {
    if (typeof obj[field] !== 'string') {
      throw new Error(
        `Impact Card output must include a string field "${field}". Got: ${typeof obj[field]}`,
      );
    }
    const value = (obj[field] as string).trim();
    if (value === '') {
      throw new Error(`Impact Card field "${field}" must be a non-empty string`);
    }
    result[field] = value;
  }

  // Enforce per-field word limit (Requirement 10.3: each field ≤ 15 words)
  for (const field of IMPACT_CARD_FIELDS) {
    if (countWords(result[field]) > MAX_IMPACT_CARD_FIELD_WORDS) {
      result[field] = truncateToWordLimit(result[field], MAX_IMPACT_CARD_FIELD_WORDS);
    }
  }

  // Red risk level: ensure recommendedAction reflects professional recovery (Requirement 10.4)
  if (riskLevel === 'Red') {
    if (containsInternalAccessLanguage(result.recommendedAction)) {
      result.recommendedAction = RED_RISK_DEFAULT_ACTION;
    }
  }

  // Enforce total word count limit (Requirement 10.2: total ≤ 120 words)
  let totalWords = 0;
  for (let i = 0; i < IMPACT_CARD_FIELDS.length; i++) {
    totalWords += countWords(result[IMPACT_CARD_FIELDS[i]]);
  }

  if (totalWords > MAX_IMPACT_CARD_TOTAL_WORDS) {
    // Truncate longest fields first until within limit
    while (totalWords > MAX_IMPACT_CARD_TOTAL_WORDS) {
      // Find the longest field (by word count)
      let longestField: string = IMPACT_CARD_FIELDS[0];
      let longestCount = 0;
      for (let i = 0; i < IMPACT_CARD_FIELDS.length; i++) {
        const fieldName = IMPACT_CARD_FIELDS[i];
        const wc = countWords(result[fieldName]);
        if (wc > longestCount) {
          longestCount = wc;
          longestField = fieldName;
        }
      }

      // If the longest field is already 1 word, we can't truncate further
      if (longestCount <= 1) {
        break;
      }

      // Truncate the longest field by one word
      const newCount = longestCount - 1;
      result[longestField] = truncateToWordLimit(result[longestField], newCount);
      totalWords -= 1;
    }
  }

  return result as unknown as ImpactCardOutput;
}
