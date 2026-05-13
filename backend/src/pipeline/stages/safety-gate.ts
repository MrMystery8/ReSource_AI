import {
  RiskLevel,
  SafetyGateOutput,
  TriageSession,
} from '@resource-ai/shared';
import {
  MIN_EVIDENCE_CHAR_THRESHOLD,
  RISK_LEVEL_ORDER,
} from '@resource-ai/shared';

/**
 * Valid risk levels for the Safety Gate classification.
 */
const VALID_RISK_LEVELS: ReadonlySet<string> = new Set(RISK_LEVEL_ORDER);

/**
 * Default hazard message when no hazards are identified.
 */
const DEFAULT_HAZARD =
  'Unknown hazards - insufficient information for safety classification';

/**
 * Prompt template for the Safety Gate stage.
 *
 * This is used by the PromptBuilder to construct the full prompt.
 * The Safety Gate classifies device risk and identifies hazards.
 */
export const SAFETY_GATE_PROMPT_TEMPLATE = `You are a safety assessment specialist for e-waste devices. Perform a dedicated Safety Gate classification.

Classify the device into exactly one Risk_Level:
- Green: low risk, external components only
- Yellow: caution, simple internal parts accessible
- Orange: supervised handling only
- Red: do not open, professional recovery required

You MUST provide:
- riskLevel: exactly one of Green, Yellow, Orange, Red
- identifiedHazards: at least one hazard (even if minor)
- doNotPerform: actions the user must NOT perform
- safeActions: actions that are safe to perform
- stopConditions: conditions under which the user should stop
- recommendedSafeNextStep: a single recommended safe next step

If device condition or internal state information is incomplete, default to the next higher Risk_Level rather than assuming the lower risk.`;

/**
 * Validates and normalizes raw parsed JSON into a SafetyGateOutput structure.
 *
 * Applies the following validation rules:
 * - riskLevel must be exactly one of: Green, Yellow, Orange, Red (defaults to Red if invalid/missing per Req 5.5)
 * - identifiedHazards must be an array with at least 1 item
 * - doNotPerform, safeActions, stopConditions must be arrays
 * - recommendedSafeNextStep must be a non-empty string
 * - Conservative escalation: if device condition info appears incomplete, escalate risk one tier (Req 5.4)
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param session - The current triage session (used for evidence completeness check)
 * @returns A validated SafetyGateOutput
 */
export function validateSafetyGateOutput(
  raw: unknown,
  session: TriageSession,
): SafetyGateOutput {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  // Validate riskLevel - default to Red if missing or invalid (Requirement 5.5)
  let riskLevel: RiskLevel = 'Red';
  if (typeof obj.riskLevel === 'string' && VALID_RISK_LEVELS.has(obj.riskLevel)) {
    riskLevel = obj.riskLevel as RiskLevel;
  }

  // Validate identifiedHazards - must be array with at least 1 item
  let identifiedHazards: string[] = [];
  if (Array.isArray(obj.identifiedHazards)) {
    identifiedHazards = obj.identifiedHazards
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }
  if (identifiedHazards.length === 0) {
    identifiedHazards = [DEFAULT_HAZARD];
  }

  // Validate doNotPerform - must be array of strings
  const doNotPerform: string[] = normalizeStringArray(obj.doNotPerform);

  // Validate safeActions - must be array of strings
  const safeActions: string[] = normalizeStringArray(obj.safeActions);

  // Validate stopConditions - must be array of strings
  const stopConditions: string[] = normalizeStringArray(obj.stopConditions);

  // Validate recommendedSafeNextStep - must be non-empty string
  let recommendedSafeNextStep: string;
  if (typeof obj.recommendedSafeNextStep === 'string' && obj.recommendedSafeNextStep.trim().length > 0) {
    recommendedSafeNextStep = obj.recommendedSafeNextStep.trim();
  } else {
    recommendedSafeNextStep = 'Consult a professional e-waste handler before proceeding.';
  }

  // Apply conservative escalation if device condition info is incomplete (Requirement 5.4)
  riskLevel = applyConservativeEscalation(riskLevel, session);

  return {
    riskLevel,
    identifiedHazards,
    doNotPerform,
    safeActions,
    stopConditions,
    recommendedSafeNextStep,
  };
}

/**
 * Applies conservative risk escalation when device condition information
 * appears incomplete.
 *
 * Escalation triggers:
 * - No device evidence files uploaded
 * - Any required text field has fewer than MIN_EVIDENCE_CHAR_THRESHOLD characters
 *
 * When triggered, escalates risk one tier:
 * Green → Yellow, Yellow → Orange, Orange → Red, Red stays Red
 *
 * @param currentLevel - The current risk level from LLM response
 * @param session - The triage session with user inputs
 * @returns The potentially escalated risk level
 */
function applyConservativeEscalation(
  currentLevel: RiskLevel,
  session: TriageSession,
): RiskLevel {
  const hasFiles = session.inputs.fileIds.length > 0;
  const hasShortInput =
    session.inputs.deviceIdentity.length < MIN_EVIDENCE_CHAR_THRESHOLD ||
    session.inputs.failureSymptoms.length < MIN_EVIDENCE_CHAR_THRESHOLD ||
    !session.inputs.userContext.expertiseLevel;

  // Only escalate if evidence is incomplete: no files AND short text inputs
  if (!hasFiles && hasShortInput) {
    const currentIndex = RISK_LEVEL_ORDER.indexOf(currentLevel);
    const escalatedIndex = Math.min(currentIndex + 1, RISK_LEVEL_ORDER.length - 1);
    return RISK_LEVEL_ORDER[escalatedIndex] as RiskLevel;
  }

  return currentLevel;
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
