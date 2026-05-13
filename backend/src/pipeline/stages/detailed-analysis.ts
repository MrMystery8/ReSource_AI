import {
  ComponentEntry,
  DetailedAnalysisOutput,
  RiskLevel,
} from '@resource-ai/shared';
import {
  MAX_DETAILED_ANALYSIS_WORDS,
  MAX_VERDICT_SUMMARY_WORDS,
} from '@resource-ai/shared';

/**
 * Valid component types for the Detailed Analysis stage.
 */
const VALID_COMPONENT_TYPES: ReadonlySet<string> = new Set(['internal', 'external']);

/**
 * Prompt template for the Detailed Resource Analysis stage.
 *
 * Used by the PromptBuilder to construct the full prompt.
 * The Detailed Analysis identifies device components and their condition.
 */
export const DETAILED_ANALYSIS_PROMPT_TEMPLATE = `You are a detailed resource analysis specialist for e-waste devices. Perform a comprehensive component-level analysis.

You MUST provide a JSON response with these fields:
- probableDeviceIdentity: string identifying the device
- componentProfile: array of components, each with:
  - name: component name
  - function: what the component does
  - type: "internal" or "external"
  - conditionScore: 1-5 (1=non-functional, 5=fully functional)
- failurePatternAnalysis: string describing failure patterns
- diagnosticVerdict: string with overall diagnostic conclusion
- verdictSummary: string of no more than 30 words summarizing the verdict

IMPORTANT CONSTRAINTS:
- Total response must be 350 words or fewer.
- verdictSummary must be 30 words or fewer.
- If Risk_Level is Red: EXCLUDE all internal components. Only analyze externally visible parts.
- If Risk_Level is Orange: FLAG internal components as requiring supervised handling (set requiresSupervision to true).`;

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
 * Calculates the total word count of a DetailedAnalysisOutput.
 * Counts words across all text fields and component entries.
 */
function calculateTotalWordCount(output: DetailedAnalysisOutput): number {
  let total = 0;
  total += countWords(output.probableDeviceIdentity);
  total += countWords(output.failurePatternAnalysis);
  total += countWords(output.diagnosticVerdict);
  total += countWords(output.verdictSummary);

  for (const component of output.componentProfile) {
    total += countWords(component.name);
    total += countWords(component.function);
    total += countWords(component.type);
  }

  return total;
}

/**
 * Validates a single component entry from the raw response.
 *
 * @param entry - The raw component entry object
 * @param index - The index in the array (for error messages)
 * @returns A validated ComponentEntry
 * @throws Error if the entry is invalid
 */
function validateComponentEntry(entry: unknown, index: number): ComponentEntry {
  if (typeof entry !== 'object' || entry === null) {
    throw new Error(`componentProfile[${index}] must be a non-null object`);
  }

  const obj = entry as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    throw new Error(`componentProfile[${index}].name must be a non-empty string`);
  }

  if (typeof obj.function !== 'string' || obj.function.trim() === '') {
    throw new Error(`componentProfile[${index}].function must be a non-empty string`);
  }

  if (typeof obj.type !== 'string' || !VALID_COMPONENT_TYPES.has(obj.type)) {
    throw new Error(
      `componentProfile[${index}].type must be "internal" or "external". Got: ${String(obj.type)}`,
    );
  }

  const conditionScore = Number(obj.conditionScore);
  if (!Number.isFinite(conditionScore) || conditionScore < 1 || conditionScore > 5) {
    throw new Error(
      `componentProfile[${index}].conditionScore must be a number between 1 and 5. Got: ${String(obj.conditionScore)}`,
    );
  }

  return {
    name: obj.name.trim(),
    function: (obj.function as string).trim(),
    type: obj.type as 'internal' | 'external',
    conditionScore: Math.round(conditionScore),
  };
}

/**
 * Validates and normalizes raw parsed JSON into a DetailedAnalysisOutput structure.
 *
 * Applies the following validation and transformation rules:
 * - probableDeviceIdentity must be a non-empty string
 * - componentProfile must be an array of valid ComponentEntry objects
 * - Each ComponentEntry must have: name (string), function (string), type ('internal'|'external'), conditionScore (1-5)
 * - If riskLevel is Red: filter out internal components from componentProfile (Req 6.3)
 * - If riskLevel is Orange: set requiresSupervision=true on internal components (Req 6.4)
 * - verdictSummary must be ≤ 30 words (truncated if needed)
 * - Total word count must be ≤ 350 (truncated if needed)
 * - failurePatternAnalysis must be a non-empty string
 * - diagnosticVerdict must be a non-empty string
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param riskLevel - The risk level from the Safety Gate stage
 * @returns A validated DetailedAnalysisOutput
 * @throws Error if the raw output does not conform to the expected structure
 */
export function validateDetailedAnalysisOutput(
  raw: unknown,
  riskLevel: RiskLevel,
): DetailedAnalysisOutput {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new Error('Detailed Analysis output must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate probableDeviceIdentity
  if (typeof obj.probableDeviceIdentity !== 'string' || obj.probableDeviceIdentity.trim() === '') {
    throw new Error('Detailed Analysis output must include a non-empty probableDeviceIdentity string');
  }

  // Validate componentProfile
  if (!Array.isArray(obj.componentProfile)) {
    throw new Error('Detailed Analysis componentProfile must be an array');
  }

  let componentProfile: ComponentEntry[] = obj.componentProfile.map(
    (entry: unknown, index: number) => validateComponentEntry(entry, index),
  );

  // Apply risk-level constraints to componentProfile
  if (riskLevel === 'Red') {
    // Requirement 6.3: Exclude all internal components
    componentProfile = componentProfile.filter((c) => c.type === 'external');
  } else if (riskLevel === 'Orange') {
    // Requirement 6.4: Flag internal components as requiring supervised handling
    componentProfile = componentProfile.map((c) => {
      if (c.type === 'internal') {
        return { ...c, requiresSupervision: true };
      }
      return c;
    });
  }

  // Validate failurePatternAnalysis
  if (typeof obj.failurePatternAnalysis !== 'string' || obj.failurePatternAnalysis.trim() === '') {
    throw new Error('Detailed Analysis output must include a non-empty failurePatternAnalysis string');
  }

  // Validate diagnosticVerdict
  if (typeof obj.diagnosticVerdict !== 'string' || obj.diagnosticVerdict.trim() === '') {
    throw new Error('Detailed Analysis output must include a non-empty diagnosticVerdict string');
  }

  // Validate verdictSummary
  if (typeof obj.verdictSummary !== 'string' || obj.verdictSummary.trim() === '') {
    throw new Error('Detailed Analysis output must include a non-empty verdictSummary string');
  }

  // Enforce verdict summary word limit (Requirement 6.1: max 30 words)
  let verdictSummary = obj.verdictSummary.trim();
  if (countWords(verdictSummary) > MAX_VERDICT_SUMMARY_WORDS) {
    verdictSummary = truncateToWordLimit(verdictSummary, MAX_VERDICT_SUMMARY_WORDS);
  }

  // Build the output
  let output: DetailedAnalysisOutput = {
    probableDeviceIdentity: obj.probableDeviceIdentity.trim(),
    componentProfile,
    failurePatternAnalysis: (obj.failurePatternAnalysis as string).trim(),
    diagnosticVerdict: (obj.diagnosticVerdict as string).trim(),
    verdictSummary,
  };

  // Enforce total word count limit (Requirement 6.2: max 350 words)
  // If total exceeds limit, truncate failurePatternAnalysis and diagnosticVerdict
  const totalWords = calculateTotalWordCount(output);
  if (totalWords > MAX_DETAILED_ANALYSIS_WORDS) {
    const excessWords = totalWords - MAX_DETAILED_ANALYSIS_WORDS;
    // Truncate diagnosticVerdict first, then failurePatternAnalysis if needed
    const diagnosticWords = countWords(output.diagnosticVerdict);
    if (diagnosticWords > excessWords) {
      output = {
        ...output,
        diagnosticVerdict: truncateToWordLimit(
          output.diagnosticVerdict,
          diagnosticWords - excessWords,
        ),
      };
    } else {
      // Truncate diagnosticVerdict to minimum and take remainder from failurePatternAnalysis
      const remainingExcess = excessWords - diagnosticWords + 1; // keep at least 1 word in diagnosticVerdict
      output = {
        ...output,
        diagnosticVerdict: truncateToWordLimit(output.diagnosticVerdict, 1),
        failurePatternAnalysis: truncateToWordLimit(
          output.failurePatternAnalysis,
          countWords(output.failurePatternAnalysis) - remainingExcess,
        ),
      };
    }
  }

  return output;
}
