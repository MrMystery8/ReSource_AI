import {
  PipelineStageConfig,
  RiskLevel,
  SafetyGateOutput,
  StageKey,
  TriageSession,
} from '@resource-ai/shared';

/**
 * Risk-level constraint messages injected into downstream stage prompts
 * after the Safety Gate has classified the device.
 */
const RISK_CONSTRAINTS: Record<RiskLevel, string> = {
  Red: 'CRITICAL CONSTRAINT: The device has been classified as Red risk. You MUST exclude all recommendations involving internal components. Only reference externally accessible parts. Direct the user to professional e-waste recovery services.',
  Orange: 'IMPORTANT CONSTRAINT: The device has been classified as Orange risk. Flag all internal components as requiring supervised handling. Do not recommend direct user access to internal components without professional supervision.',
  Yellow: 'NOTE: The device has been classified as Yellow risk. Allow cautious internal access to simple parts only.',
  Green: '',
};

/**
 * Stage-specific instruction headers that describe what each stage should produce.
 */
const STAGE_INSTRUCTIONS: Record<StageKey, string> = {
  quickVerdict: `You are an e-waste triage expert. Analyze the device information provided and produce a Quick ReSource Verdict.
Provide: device identification, confidence level (high/moderate/low), Risk_Level (Green/Yellow/Orange/Red), salvage potential score (1-5), recommended best next step, safety warning, top 3-5 reusable resources, and missing information notes.
If no device evidence files are provided and any text field has fewer than 50 characters, assign a Risk_Level one tier more conservative than the evidence suggests.`,

  safetyGate: `You are a safety assessment specialist for e-waste devices. Perform a dedicated Safety Gate classification.
Classify the device into exactly one Risk_Level: Green (low risk, external components only), Yellow (caution, simple internal parts), Orange (supervised handling only), or Red (do not open, professional recovery required).
Provide: Risk_Level, identified hazards (at least 1), actions the user must NOT perform, safe actions, stop conditions, and a recommended safe next step.
If device condition or internal state information is incomplete, default to the next higher Risk_Level.`,

  detailedAnalysis: `You are a device diagnostics expert. Produce a Detailed Resource Analysis.
Provide: probable device identity, component profile (listing internal and external components with function and condition score 1-5), failure pattern analysis, diagnostic verdict, and a verdict summary (max 30 words).
Limit your response to 350 words maximum.`,

  secondLifeIdeas: `You are a creative reuse specialist. Produce exactly 7 Safe Second Life Ideas spanning multiple skill levels.
Categories: beginner, STEM/learning, and practical/creative.
Each idea MUST include ALL of these fields (no field may be empty or omitted):
  - category: one of "beginner", "stem-learning", or "practical-creative"
  - title: a short project name
  - description: brief description (max 90 words)
  - skillLevel: REQUIRED — MUST be exactly one of "Beginner", "Intermediate", "Advanced", or "Professional" (case-sensitive, no other values allowed)
  - requiredComponents: array of components from the device
  - additionalMaterials: array of extra materials needed

SKILL LEVEL RULES (CRITICAL):
- The user's expertise level is provided in User Inputs. The FIRST 3 ideas MUST have a skillLevel that matches or is below the user's stated expertise level:
  * If user is "Beginner" → first 3 ideas must all be skillLevel "Beginner"
  * If user is "Intermediate" → first 3 ideas can be "Beginner" or "Intermediate"
  * If user is "Expert" → first 3 ideas can be "Beginner", "Intermediate", or "Advanced"
- The REMAINING 4 ideas MUST cover OTHER skill levels not used in the first 3. Include a mix of higher and/or lower levels.
- EVERY idea MUST have a non-empty skillLevel field. Never omit it.

TAILORING RULES:
- Motivation: prioritise ideas that align with the user's stated motivation for the first 3 ideas
- Material Availability: only suggest ideas achievable with the user's available tools
- Time Commitment: the first 3 ideas should be completable within the user's stated time commitment
- The remaining 4 ideas may have different time/tool requirements`,

  nextSteps: `You are a safe recovery advisor. Produce Safe Next Steps and Recovery Route.
Provide: safe first actions (3-5 ordered steps), parts to keep, parts to avoid, overall recommendation, trash warnings, local recovery note, and hazard warnings referencing the Safety Gate hazard list.
Limit your response to 300 words maximum.
Handling tiers: Green allows external + simple internal; Yellow allows cautious internal; Orange allows supervised only; Red allows external inspection only with professional referral.`,

  conceptVisual: `You are an image prompt specialist. Generate a concept image for the device's best outcome.`,
};


/**
 * Output format schemas for each stage, guiding the LLM to produce structured JSON.
 */
const OUTPUT_SCHEMAS: Record<StageKey, string> = {
  quickVerdict: JSON.stringify({
    deviceIdentification: 'string',
    confidence: 'high | moderate | low',
    riskLevel: 'Green | Yellow | Orange | Red',
    salvageScore: 'number (1-5)',
    bestNextStep: 'string',
    safetyWarning: 'string',
    topReusableResources: ['string (3-5 items)'],
    missingInfoNotes: 'string',
  }, null, 2),

  safetyGate: JSON.stringify({
    riskLevel: 'Green | Yellow | Orange | Red',
    identifiedHazards: ['string (at least 1)'],
    doNotPerform: ['string'],
    safeActions: ['string'],
    stopConditions: ['string'],
    recommendedSafeNextStep: 'string',
  }, null, 2),

  detailedAnalysis: JSON.stringify({
    probableDeviceIdentity: 'string',
    componentProfile: [{
      name: 'string',
      function: 'string',
      type: 'internal | external',
      conditionScore: 'number (1-5)',
      requiresSupervision: 'boolean (optional)',
    }],
    failurePatternAnalysis: 'string',
    diagnosticVerdict: 'string',
    verdictSummary: 'string (max 30 words)',
  }, null, 2),

  secondLifeIdeas: JSON.stringify({
    ideas: [{
      category: 'beginner | stem-learning | practical-creative',
      title: 'string (required)',
      description: 'string (max 90 words, required)',
      skillLevel: 'REQUIRED: exactly one of Beginner | Intermediate | Advanced | Professional',
      requiredComponents: ['string (required, at least 1)'],
      additionalMaterials: ['string (can be empty array)'],
    }],
  }, null, 2),

  nextSteps: JSON.stringify({
    safeFirstActions: ['string (3-5 ordered steps)'],
    partsToKeep: ['string'],
    partsToAvoid: ['string'],
    overallRecommendation: 'string',
    trashWarnings: ['string'],
    localRecoveryNote: 'string',
    hazardWarnings: [{
      component: 'string',
      risk: 'string',
    }],
  }, null, 2),

  conceptVisual: 'Generate a single 1024x1024 PNG image based on the prompt description.',
};

/**
 * Stages that come after the Safety Gate and should receive risk-level constraints.
 */
const POST_SAFETY_GATE_STAGES: Set<StageKey> = new Set([
  'detailedAnalysis',
  'secondLifeIdeas',
  'nextSteps',
  'conceptVisual',
]);

/**
 * PromptBuilder constructs stage-specific prompts for the triage pipeline.
 *
 * Each prompt includes:
 * - A stage-specific instruction header
 * - All user inputs (deviceIdentity, failureSymptoms, userContext, fileIds)
 * - Accumulated outputs from all prior stages (empty for stage 1)
 * - Risk-level constraints (for stages after Safety Gate)
 * - Expected output format schema
 */
export class PromptBuilder {
  /**
   * Builds a text prompt for a given pipeline stage.
   *
   * @param stage - The pipeline stage configuration
   * @param session - The current triage session with user inputs
   * @param accumulatedOutputs - All outputs from prior stages (keyed by stage key)
   * @returns The constructed prompt string
   */
  buildPrompt(
    stage: PipelineStageConfig,
    session: TriageSession,
    accumulatedOutputs: Record<string, unknown>
  ): string {
    const sections: string[] = [];

    // Stage-specific instruction header
    sections.push(STAGE_INSTRUCTIONS[stage.key]);

    // User Inputs section
    sections.push(this.buildUserInputsSection(session));

    // Prior Stage Outputs section (empty for first stage)
    sections.push(this.buildPriorOutputsSection(accumulatedOutputs));

    // Risk Level Constraints (only for post-Safety Gate stages)
    const constraintSection = this.buildRiskConstraintsSection(stage.key, accumulatedOutputs);
    if (constraintSection) {
      sections.push(constraintSection);
    }

    // Output Format section
    sections.push(this.buildOutputFormatSection(stage.key));

    return sections.join('\n\n');
  }

  /**
   * Builds an image generation prompt for the Concept Visual stage.
   *
   * @param session - The current triage session
   * @param accumulatedOutputs - All outputs from prior stages
   * @returns The image generation prompt string
   */
  buildImagePrompt(
    session: TriageSession,
    accumulatedOutputs: Record<string, unknown>
  ): string {
    const riskLevel = this.extractRiskLevel(accumulatedOutputs);
    const deviceIdentity = session.inputs.deviceIdentity;

    if (riskLevel === 'Red') {
      return `Create a clean, professional illustration of a certified e-waste recovery and recycling facility processing a ${deviceIdentity}. Show proper safety equipment, professional handling, and responsible recycling. The image should convey safety, professionalism, and environmental responsibility. Style: modern, informative, reassuring. No text overlays.`;
    }

    // For Green, Yellow, Orange: depict the safest second-life project
    const secondLifeIdeas = accumulatedOutputs['secondLifeIdeas'] as { ideas?: Array<{ title?: string; description?: string }> } | undefined;
    const bestIdea = secondLifeIdeas?.ideas?.[0];
    const ideaDescription = bestIdea
      ? `${bestIdea.title}: ${bestIdea.description}`
      : `a creative reuse project using components from a ${deviceIdentity}`;

    return `Create a bright, inspiring illustration of a DIY maker project: ${ideaDescription}. Show the project in a safe, well-lit workspace with appropriate tools. The image should convey creativity, safety, and sustainability. Style: modern, colorful, encouraging. No text overlays.`;
  }

  /**
   * Formats the user inputs section of the prompt.
   */
  private buildUserInputsSection(session: TriageSession): string {
    const { deviceIdentity, failureSymptoms, userContext, fileIds } = session.inputs;
    const imageNote = fileIds.length > 0
      ? `${fileIds.length} image(s) attached — examine the photos carefully for device identification, visible damage, component condition, and any safety hazards.`
      : 'No images provided — rely on text descriptions only. Be more conservative in risk assessment.';

    return `## User Inputs
Device Identity: ${deviceIdentity}
Failure Symptoms: ${failureSymptoms}
User Context:
  - Expertise Level: ${userContext.expertiseLevel}
  - Motivation: ${userContext.motivation}
  - Material Availability: ${userContext.materialAvailability}
  - Time Commitment: ${userContext.timeCommitment}
Evidence Images: ${imageNote}`;
  }

  /**
   * Formats the prior stage outputs section.
   * Returns an empty section indicator for the first stage.
   */
  private buildPriorOutputsSection(accumulatedOutputs: Record<string, unknown>): string {
    const keys = Object.keys(accumulatedOutputs);
    if (keys.length === 0) {
      return `## Prior Stage Outputs
None (this is the first stage)`;
    }

    return `## Prior Stage Outputs
${JSON.stringify(accumulatedOutputs, null, 2)}`;
  }

  /**
   * Builds risk-level constraints section for post-Safety Gate stages.
   * Returns null if the stage is before/at Safety Gate or if no Safety Gate output exists.
   */
  private buildRiskConstraintsSection(
    stageKey: StageKey,
    accumulatedOutputs: Record<string, unknown>
  ): string | null {
    if (!POST_SAFETY_GATE_STAGES.has(stageKey)) {
      return null;
    }

    const riskLevel = this.extractRiskLevel(accumulatedOutputs);
    const constraint = RISK_CONSTRAINTS[riskLevel];

    if (!constraint) {
      return null;
    }

    return `## Risk Level Constraints
${constraint}`;
  }

  /**
   * Formats the output format section with the expected JSON schema.
   */
  private buildOutputFormatSection(stageKey: StageKey): string {
    return `## Output Format
Respond with valid JSON matching this schema:
${OUTPUT_SCHEMAS[stageKey]}`;
  }

  /**
   * Extracts the risk level from accumulated outputs.
   * Checks Safety Gate output first, falls back to Quick Verdict, defaults to Red.
   */
  private extractRiskLevel(accumulatedOutputs: Record<string, unknown>): RiskLevel {
    const safetyGate = accumulatedOutputs['safetyGate'] as SafetyGateOutput | undefined;
    if (safetyGate?.riskLevel) {
      return safetyGate.riskLevel;
    }

    // Fallback: default to Red if Safety Gate output is missing (conservative approach)
    return 'Red';
  }
}
