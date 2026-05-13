import {
  LikelyPresence,
  PartsMapRow,
  PartVerdict,
  ReusablePartsMapOutput,
  ReuseValue,
  RiskLevel,
  SkillLevel,
  REUSABLE_PARTS_MIN_ROWS,
  REUSABLE_PARTS_MAX_ROWS,
} from '@resource-ai/shared';

/**
 * Skill level ordering from lowest to highest.
 * Beginner < Intermediate < Advanced < Professional
 */
const SKILL_LEVEL_ORDER: readonly SkillLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Professional',
];

/**
 * Valid values for the likelyPresence field.
 */
const VALID_LIKELY_PRESENCE: readonly LikelyPresence[] = ['Confirmed', 'Probable', 'Uncertain'];

/**
 * Valid values for the reuseValue field.
 */
const VALID_REUSE_VALUE: readonly ReuseValue[] = ['High', 'Medium', 'Low', 'None'];

/**
 * Valid values for the skillNeeded field.
 */
const VALID_SKILL_NEEDED: readonly SkillLevel[] = SKILL_LEVEL_ORDER;

/**
 * Valid values for the verdict field.
 */
const VALID_VERDICT: readonly PartVerdict[] = ['Salvage', 'Conditional', 'Do Not Access'];

/**
 * Prompt template for the Reusable Parts Map stage.
 *
 * This is used by the PromptBuilder to construct the full prompt.
 * The Reusable Parts Map identifies salvageable components with skill and safety constraints.
 */
export const REUSABLE_PARTS_MAP_PROMPT_TEMPLATE = `You are a component recovery specialist for e-waste devices. Produce a Reusable Parts Map as a structured table.

For each identifiable part or resource in the device, provide:
- partResource: the component name
- likelyPresence: one of Confirmed, Probable, or Uncertain
- reuseValue: one of High, Medium, Low, or None
- possibleUse: a brief description of how the part could be reused
- skillNeeded: one of Beginner, Intermediate, Advanced, or Professional
- safetyConcern: description of any associated hazard, or "None"
- verdict: one of Salvage, Conditional, or Do Not Access

You MUST include between ${REUSABLE_PARTS_MIN_ROWS} and ${REUSABLE_PARTS_MAX_ROWS} rows.

RISK LEVEL CONSTRAINTS:
- If Risk_Level is Red: ALL components requiring opening the device enclosure MUST have verdict "Do Not Access" and skillNeeded "Professional". Only externally accessible parts may have other verdicts.
- If Risk_Level is Orange: ALL components requiring opening the device enclosure MUST have verdict "Conditional" and a non-empty safetyConcern describing required supervision or precaution.
- Skill Needed for any row with verdict "Salvage" MUST NOT exceed the user's stated skill level.

Return the result as JSON with a "parts" array containing the row objects.`;

/**
 * Returns the numeric index of a skill level in the ordering.
 * Higher index means higher skill level.
 */
function getSkillLevelIndex(skill: SkillLevel): number {
  return SKILL_LEVEL_ORDER.indexOf(skill);
}

/**
 * Determines if a skill level exceeds a maximum allowed skill level.
 *
 * @param skill - The skill level to check
 * @param maxSkill - The maximum allowed skill level
 * @returns true if skill exceeds maxSkill
 */
function skillExceedsLevel(skill: SkillLevel, maxSkill: SkillLevel): boolean {
  return getSkillLevelIndex(skill) > getSkillLevelIndex(maxSkill);
}

/**
 * Validates and processes raw Reusable Parts Map output from the LLM.
 *
 * Performs structural validation, enum validation, row count checks, and applies
 * risk-level constraints:
 * - Red: internal parts get verdict="Do Not Access", skillNeeded="Professional"
 * - Orange: internal parts get verdict="Conditional", non-empty safetyConcern
 * - Salvage verdicts: skillNeeded must not exceed userSkillLevel
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param riskLevel - The Safety Gate risk level for this session
 * @param userSkillLevel - The user's stated skill level (defaults to 'Beginner')
 * @returns A validated ReusablePartsMapOutput
 * @throws Error if the raw output does not conform to the expected structure
 */
export function validateReusablePartsMapOutput(
  raw: unknown,
  riskLevel: RiskLevel,
  userSkillLevel?: SkillLevel,
): ReusablePartsMapOutput {
  const effectiveSkillLevel: SkillLevel = userSkillLevel ?? 'Beginner';

  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new Error('Reusable Parts Map output must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate parts array exists
  if (!Array.isArray(obj.parts)) {
    throw new Error('Reusable Parts Map output must contain a "parts" array');
  }

  const partsArray = obj.parts;

  // Validate row count
  if (partsArray.length < REUSABLE_PARTS_MIN_ROWS || partsArray.length > REUSABLE_PARTS_MAX_ROWS) {
    throw new Error(
      `Reusable Parts Map must have ${REUSABLE_PARTS_MIN_ROWS}-${REUSABLE_PARTS_MAX_ROWS} rows. Got: ${partsArray.length}`,
    );
  }

  // Validate and transform each row
  const validatedParts: PartsMapRow[] = partsArray.map((row, index) => {
    return validateAndTransformRow(row, index, riskLevel, effectiveSkillLevel);
  });

  return { parts: validatedParts };
}

/**
 * Validates a single row of the parts map and applies risk-level overrides.
 *
 * @param row - The raw row object
 * @param index - The row index (for error messages)
 * @param riskLevel - The Safety Gate risk level
 * @param userSkillLevel - The user's effective skill level
 * @returns A validated PartsMapRow
 * @throws Error if the row does not conform to the expected structure
 */
function validateAndTransformRow(
  row: unknown,
  index: number,
  riskLevel: RiskLevel,
  userSkillLevel: SkillLevel,
): PartsMapRow {
  if (row === null || row === undefined || typeof row !== 'object') {
    throw new Error(`Reusable Parts Map row ${index} must be a non-null object`);
  }

  const r = row as Record<string, unknown>;

  // Validate partResource
  if (typeof r.partResource !== 'string' || r.partResource.trim() === '') {
    throw new Error(`Row ${index}: partResource must be a non-empty string`);
  }

  // Validate likelyPresence
  if (!VALID_LIKELY_PRESENCE.includes(r.likelyPresence as LikelyPresence)) {
    throw new Error(
      `Row ${index}: likelyPresence must be one of: ${VALID_LIKELY_PRESENCE.join(', ')}. Got: ${String(r.likelyPresence)}`,
    );
  }

  // Validate reuseValue
  if (!VALID_REUSE_VALUE.includes(r.reuseValue as ReuseValue)) {
    throw new Error(
      `Row ${index}: reuseValue must be one of: ${VALID_REUSE_VALUE.join(', ')}. Got: ${String(r.reuseValue)}`,
    );
  }

  // Validate possibleUse
  if (typeof r.possibleUse !== 'string' || r.possibleUse.trim() === '') {
    throw new Error(`Row ${index}: possibleUse must be a non-empty string`);
  }

  // Validate skillNeeded
  if (!VALID_SKILL_NEEDED.includes(r.skillNeeded as SkillLevel)) {
    throw new Error(
      `Row ${index}: skillNeeded must be one of: ${VALID_SKILL_NEEDED.join(', ')}. Got: ${String(r.skillNeeded)}`,
    );
  }

  // Validate safetyConcern
  if (typeof r.safetyConcern !== 'string') {
    throw new Error(`Row ${index}: safetyConcern must be a string`);
  }

  // Validate verdict
  if (!VALID_VERDICT.includes(r.verdict as PartVerdict)) {
    throw new Error(
      `Row ${index}: verdict must be one of: ${VALID_VERDICT.join(', ')}. Got: ${String(r.verdict)}`,
    );
  }

  // Build the validated row
  let skillNeeded = r.skillNeeded as SkillLevel;
  let verdict = r.verdict as PartVerdict;
  let safetyConcern = r.safetyConcern as string;

  // Determine if this is an internal part (requires opening the device enclosure).
  // Internal parts are those with verdict "Conditional" or "Do Not Access" from the LLM,
  // or those with skill level "Advanced" or "Professional" which typically indicate
  // internal components. We also check if the LLM already marked them appropriately.
  const isInternalPart = isLikelyInternalPart(verdict, skillNeeded);

  // Apply Red risk-level overrides: internal parts → "Do Not Access" + "Professional"
  if (riskLevel === 'Red' && isInternalPart) {
    verdict = 'Do Not Access';
    skillNeeded = 'Professional';
  }

  // Apply Orange risk-level overrides: internal parts → "Conditional" + non-empty safetyConcern
  if (riskLevel === 'Orange' && isInternalPart) {
    verdict = 'Conditional';
    if (safetyConcern.trim() === '' || safetyConcern === 'None') {
      safetyConcern = 'Requires supervised handling due to Orange risk classification';
    }
  }

  // Apply skill level constraint for "Salvage" verdicts
  if (verdict === 'Salvage' && skillExceedsLevel(skillNeeded, userSkillLevel)) {
    // Downgrade skill to user's level - the part is still salvageable but
    // we cap the skill requirement to what the user can handle
    skillNeeded = userSkillLevel;
  }

  return {
    partResource: r.partResource as string,
    likelyPresence: r.likelyPresence as LikelyPresence,
    reuseValue: r.reuseValue as ReuseValue,
    possibleUse: r.possibleUse as string,
    skillNeeded,
    safetyConcern,
    verdict,
  };
}

/**
 * Determines if a part is likely an internal component based on its
 * original verdict and skill level from the LLM response.
 *
 * Internal parts are those that:
 * - Were already marked as "Conditional" or "Do Not Access" by the LLM
 * - Require "Advanced" or "Professional" skill level (indicating internal access)
 *
 * Parts with verdict "Salvage" and skill "Beginner" or "Intermediate" are
 * considered external/easily accessible.
 */
function isLikelyInternalPart(verdict: PartVerdict, skillNeeded: SkillLevel): boolean {
  // Parts already marked as restricted are internal
  if (verdict === 'Conditional' || verdict === 'Do Not Access') {
    return true;
  }

  // Parts requiring advanced skills typically need internal access
  if (skillNeeded === 'Advanced' || skillNeeded === 'Professional') {
    return true;
  }

  return false;
}
