import {
  ConfidenceLevel,
  QuickVerdictOutput,
  RiskLevel,
  TriageSession,
  MIN_EVIDENCE_CHAR_THRESHOLD,
  RISK_LEVEL_ORDER,
} from '@resource-ai/shared';

/**
 * Valid confidence levels for the Quick Verdict stage.
 */
const VALID_CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = ['high', 'moderate', 'low'];

/**
 * Valid risk levels for the Quick Verdict stage.
 */
const VALID_RISK_LEVELS: readonly RiskLevel[] = ['Green', 'Yellow', 'Orange', 'Red'];

/**
 * Validates and processes raw Quick Verdict output from the LLM.
 *
 * Performs structural validation, enum validation, range checks, and applies
 * conservative risk escalation when evidence is insufficient.
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param session - The current triage session (used for escalation logic)
 * @returns A validated QuickVerdictOutput, potentially with escalated riskLevel
 * @throws Error if the raw output does not conform to the expected structure
 */
export function validateQuickVerdictOutput(
  raw: unknown,
  session: TriageSession,
): QuickVerdictOutput {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new Error('Quick Verdict output must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate deviceIdentification
  if (typeof obj.deviceIdentification !== 'string' || obj.deviceIdentification.trim() === '') {
    throw new Error('Quick Verdict output must include a non-empty deviceIdentification string');
  }

  // Validate confidence
  if (!VALID_CONFIDENCE_LEVELS.includes(obj.confidence as ConfidenceLevel)) {
    throw new Error(
      `Quick Verdict confidence must be one of: ${VALID_CONFIDENCE_LEVELS.join(', ')}. Got: ${String(obj.confidence)}`,
    );
  }

  // Validate riskLevel
  if (!VALID_RISK_LEVELS.includes(obj.riskLevel as RiskLevel)) {
    throw new Error(
      `Quick Verdict riskLevel must be one of: ${VALID_RISK_LEVELS.join(', ')}. Got: ${String(obj.riskLevel)}`,
    );
  }

  // Validate salvageScore
  const salvageScore = Number(obj.salvageScore);
  if (!Number.isFinite(salvageScore) || salvageScore < 1 || salvageScore > 5) {
    throw new Error(
      `Quick Verdict salvageScore must be a number between 1 and 5. Got: ${String(obj.salvageScore)}`,
    );
  }

  // Validate bestNextStep
  if (typeof obj.bestNextStep !== 'string' || obj.bestNextStep.trim() === '') {
    throw new Error('Quick Verdict output must include a non-empty bestNextStep string');
  }

  // Validate safetyWarning
  if (typeof obj.safetyWarning !== 'string') {
    throw new Error('Quick Verdict output must include a safetyWarning string');
  }

  // Validate topReusableResources
  if (!Array.isArray(obj.topReusableResources)) {
    throw new Error('Quick Verdict topReusableResources must be an array');
  }
  if (obj.topReusableResources.length < 3 || obj.topReusableResources.length > 5) {
    throw new Error(
      `Quick Verdict topReusableResources must have 3-5 items. Got: ${obj.topReusableResources.length}`,
    );
  }
  for (const item of obj.topReusableResources) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new Error('Each item in topReusableResources must be a non-empty string');
    }
  }

  // Validate missingInfoNotes
  if (typeof obj.missingInfoNotes !== 'string') {
    throw new Error('Quick Verdict output must include a missingInfoNotes string');
  }

  // Build the validated output
  let riskLevel = obj.riskLevel as RiskLevel;

  // Apply conservative risk escalation
  riskLevel = applyRiskEscalation(riskLevel, session);

  const output: QuickVerdictOutput = {
    deviceIdentification: obj.deviceIdentification as string,
    confidence: obj.confidence as ConfidenceLevel,
    riskLevel,
    salvageScore: Math.round(salvageScore),
    bestNextStep: obj.bestNextStep as string,
    safetyWarning: obj.safetyWarning as string,
    topReusableResources: obj.topReusableResources as string[],
    missingInfoNotes: obj.missingInfoNotes as string,
  };

  return output;
}

/**
 * Applies conservative risk escalation when evidence is insufficient.
 *
 * If the session has no file evidence AND any text field (deviceIdentity,
 * failureSymptoms, userContext) has fewer than MIN_EVIDENCE_CHAR_THRESHOLD
 * characters, the risk level is escalated one tier:
 *   Green → Yellow, Yellow → Orange, Orange → Red, Red → Red
 *
 * @param riskLevel - The original risk level from the LLM
 * @param session - The current triage session
 * @returns The potentially escalated risk level
 */
function applyRiskEscalation(riskLevel: RiskLevel, session: TriageSession): RiskLevel {
  const hasFiles = session.inputs.fileIds.length > 0;

  if (hasFiles) {
    return riskLevel;
  }

  const { deviceIdentity, failureSymptoms, userContext } = session.inputs;
  const hasShortTextField =
    deviceIdentity.length < MIN_EVIDENCE_CHAR_THRESHOLD ||
    failureSymptoms.length < MIN_EVIDENCE_CHAR_THRESHOLD ||
    userContext.length < MIN_EVIDENCE_CHAR_THRESHOLD;

  if (!hasShortTextField) {
    return riskLevel;
  }

  // Escalate one tier
  const currentIndex = RISK_LEVEL_ORDER.indexOf(riskLevel);
  if (currentIndex === -1) {
    // Should not happen after validation, but default to Red
    return 'Red';
  }

  const escalatedIndex = Math.min(currentIndex + 1, RISK_LEVEL_ORDER.length - 1);
  return RISK_LEVEL_ORDER[escalatedIndex] as RiskLevel;
}
