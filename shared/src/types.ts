// ============================================================
// ReSource AI E-Waste Triage - Shared Type Definitions
// ============================================================

// --- Pipeline Stage Configuration ---

export interface PipelineStageConfig {
  readonly key: StageKey;
  readonly name: string;
  readonly type: 'text' | 'image';
}

export type StageKey =
  | 'quickVerdict'
  | 'safetyGate'
  | 'detailedAnalysis'
  | 'reusablePartsMap'
  | 'secondLifeIdeas'
  | 'nextSteps'
  | 'impactCard'
  | 'conceptVisual';

// --- Triage Session ---

export interface TriageSession {
  sessionId: string;
  status: 'processing' | 'complete' | 'failed';
  currentStage: string | null;
  createdAt: string;
  expiresAt: number;
  inputs: TriageInputs;
  stages: TriageStages;
  error: SessionError | null;
}

export interface TriageInputs {
  deviceIdentity: string;
  failureSymptoms: string;
  userContext: string;
  fileIds: string[];
}

export interface TriageStages {
  quickVerdict: QuickVerdictOutput | null;
  safetyGate: SafetyGateOutput | null;
  detailedAnalysis: DetailedAnalysisOutput | null;
  reusablePartsMap: ReusablePartsMapOutput | null;
  secondLifeIdeas: SecondLifeIdeasOutput | null;
  nextSteps: NextStepsOutput | null;
  impactCard: ImpactCardOutput | null;
  conceptVisual: ConceptVisualOutput | null;
}

export interface SessionError {
  stage: string;
  message: string;
}

// --- Stage Output Types ---

export type RiskLevel = 'Green' | 'Yellow' | 'Orange' | 'Red';
export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface QuickVerdictOutput {
  deviceIdentification: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  salvageScore: number;
  bestNextStep: string;
  safetyWarning: string;
  topReusableResources: string[];
  missingInfoNotes: string;
}

export interface SafetyGateOutput {
  riskLevel: RiskLevel;
  identifiedHazards: string[];
  doNotPerform: string[];
  safeActions: string[];
  stopConditions: string[];
  recommendedSafeNextStep: string;
}

export interface DetailedAnalysisOutput {
  probableDeviceIdentity: string;
  componentProfile: ComponentEntry[];
  failurePatternAnalysis: string;
  diagnosticVerdict: string;
  verdictSummary: string;
}

export interface ComponentEntry {
  name: string;
  function: string;
  type: 'internal' | 'external';
  conditionScore: number;
  requiresSupervision?: boolean;
}

export interface ReusablePartsMapOutput {
  parts: PartsMapRow[];
}

export type LikelyPresence = 'Confirmed' | 'Probable' | 'Uncertain';
export type ReuseValue = 'High' | 'Medium' | 'Low' | 'None';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
export type PartVerdict = 'Salvage' | 'Conditional' | 'Do Not Access';

export interface PartsMapRow {
  partResource: string;
  likelyPresence: LikelyPresence;
  reuseValue: ReuseValue;
  possibleUse: string;
  skillNeeded: SkillLevel;
  safetyConcern: string;
  verdict: PartVerdict;
}

export interface SecondLifeIdeasOutput {
  ideas: ProjectIdea[];
}

export type IdeaCategory = 'beginner' | 'stem-learning' | 'practical-creative';

export interface ProjectIdea {
  category: IdeaCategory;
  title: string;
  description: string;
  requiredComponents: string[];
  additionalMaterials: string[];
}

export interface NextStepsOutput {
  safeFirstActions: string[];
  partsToKeep: string[];
  partsToAvoid: string[];
  overallRecommendation: string;
  trashWarnings: string[];
  localRecoveryNote: string;
  hazardWarnings: HazardWarning[];
}

export interface HazardWarning {
  component: string;
  risk: string;
}

export interface ImpactCardOutput {
  deviceName: string;
  riskLevel: string;
  salvageScore: string;
  topReusablePart: string;
  bestSecondLifeIdea: string;
  skillLevelRequired: string;
  safetyWarning: string;
  recommendedAction: string;
  environmentalImpactNote: string;
  recoveryDifficulty: string;
  overallVerdict: string;
}

export interface ConceptVisualOutput {
  imageUrl: string;
}

// --- Error Response ---

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_FAILURE'
  | 'NOT_FOUND'
  | 'SIZE_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
  };
}

// --- API Request/Response Types ---

export interface CreateSessionRequest {
  deviceIdentity: string;
  failureSymptoms: string;
  userContext: string;
  fileIds?: string[];
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface UploadFileResponse {
  fileId: string;
  fileName: string;
  contentType: string;
}

export interface PollSessionResponse {
  sessionId: string;
  status: 'processing' | 'complete' | 'failed';
  currentStage: string | null;
  error: SessionError | null;
  stages: TriageStages;
}
