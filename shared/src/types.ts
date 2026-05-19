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
  | 'secondLifeIdeas'
  | 'nextSteps'
  | 'conceptVisual';

// --- Structured User Context ---

export type ExpertiseLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type Motivation = 'Learn Something New' | 'Environmental Impact' | 'Save Money' | 'Creative Project';
export type MaterialAvailability = 'Basic Household Tools' | 'Some Electronics Tools' | 'Full Workshop';
export type TimeCommitment = 'Under 1 Hour' | '1-3 Hours' | 'Half Day' | 'Multi-Day Project';

export interface StructuredUserContext {
  expertiseLevel: ExpertiseLevel;
  motivation: Motivation;
  materialAvailability: MaterialAvailability;
  timeCommitment: TimeCommitment;
}

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
  userId?: string;
}

export interface TriageInputs {
  deviceIdentity: string;
  failureSymptoms: string;
  userContext: StructuredUserContext;
  fileIds: string[];
}

export interface TriageStages {
  quickVerdict: QuickVerdictOutput | null;
  safetyGate: SafetyGateOutput | null;
  detailedAnalysis: DetailedAnalysisOutput | null;
  secondLifeIdeas: SecondLifeIdeasOutput | null;
  nextSteps: NextStepsOutput | null;
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

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';

export interface SecondLifeIdeasOutput {
  ideas: ProjectIdea[];
}

export type IdeaCategory = 'beginner' | 'stem-learning' | 'practical-creative';

export interface ProjectIdea {
  category: IdeaCategory;
  title: string;
  description: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
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



export interface ConceptVisualOutput {
  imageUrl: string;
}

// --- User & Auth Types ---

export type UserRole = 'user' | 'manager';
export type AuthProvider = 'legacy' | 'cognito' | 'google' | 'apple' | 'unknown';

export interface User {
  userId: string;          // UUID v4
  email: string;           // Unique, lowercase, trimmed
  passwordHash?: string;   // bcrypt hash (cost 10), legacy auth only
  displayName: string;     // 1-100 characters
  role: UserRole;
  cognitoSub?: string;
  authProvider?: AuthProvider;
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}

// Response shape (never includes passwordHash)
export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;    // Issued at (Unix timestamp)
  exp: number;    // Expires at (iat + 24 hours)
}

// --- Auth Request/Response Types ---

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface ProfileUpdateRequest {
  displayName: string;
}

// --- Admin Response Types ---

export interface UsersListResponse {
  users: UserProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionsListResponse {
  sessions: {
    sessionId: string;
    userId: string;
    status: 'processing' | 'complete' | 'failed';
    createdAt: string;
    currentStage: string | null;
  }[];
  total: number;
  limit: number;
  offset: number;
}

// --- Error Response ---

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_FAILURE'
  | 'CONFLICT'
  | 'FORBIDDEN'
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

// --- Gamification Types ---

export type UserLevel =
  | 'Recycler'
  | 'Eco-Sorter'
  | 'Resource Salvager'
  | 'Triage Specialist'
  | 'E-Waste Champion'
  | 'Green Guardian'
  | 'Eco-Legend';

export interface UserStatsResponse {
  points: number;
  level: UserLevel;
  streak: number;
  badges: BadgeInfo[];
  totalSessions: number;
  lastTriageDate: string | null;
  pointsToNextLevel: number;
  nextLevel: UserLevel | null;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  level: UserLevel;
  points: number;
  badgeCount: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
}

export interface UserSessionsResponse {
  sessions: SessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionSummary {
  sessionId: string;
  deviceName: string;
  riskLevel: string | null;
  salvageScore: number | null;
  status: 'processing' | 'complete' | 'failed';
  createdAt: string;
  pointsEarned: number;
}

// --- API Request/Response Types ---

export interface CreateSessionRequest {
  deviceIdentity: string;
  failureSymptoms: string;
  userContext: StructuredUserContext;
  fileIds?: string[];
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface UploadFileResponse {
  fileId: string;
  fileName: string;
  contentType: string;
  /** Full S3 object key, e.g. uploads/unassociated/uuid.jpg */
  s3Key: string;
}

export interface PollSessionResponse {
  sessionId: string;
  status: 'processing' | 'complete' | 'failed';
  currentStage: string | null;
  error: SessionError | null;
  stages: TriageStages;
  inputs?: TriageInputs;
}

// --- Project Types ---

export interface InstructionStep {
  stepNumber: number;
  instruction: string;
  explanation?: string;
}

export interface ImplementationGuide {
  materials: string[];
  steps: InstructionStep[];
  estimatedTime: string;
  safetyWarnings: string[];
}

export interface SubmissionResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  points: number;
  feedback: string;
  photoKeys: string[];
  submittedAt: string;
}

export interface Project {
  projectId: string;
  userId: string;
  sessionId: string;
  ideaTitle: string;
  ideaDescription: string;
  requiredComponents: string[];
  additionalMaterials: string[];
  userContext: StructuredUserContext;
  status: 'in-progress' | 'completed' | 'abandoned';
  guide?: ImplementationGuide;
  submission?: SubmissionResult;
  startedAt: string;
  updatedAt: string;
}

export interface ProjectHistoryEntry {
  projectId: string;
  ideaTitle: string;
  startedAt: string;
  status: 'in-progress' | 'completed' | 'abandoned';
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  pointsEarned?: number;
}

export interface ProjectsListResponse {
  projects: ProjectHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

// --- Community Types ---

export type VoteType = 'upvote' | 'downvote';

export interface CommunityPost {
  postId: string;
  userId: string;
  displayName: string;
  projectId: string;
  ideaTitle: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  text: string;
  imageKeys: string[];
  imageUrls?: string[];
  upvotes: number;
  downvotes: number;
  commentCount: number;
  currentUserVote?: VoteType | null;
  createdAt: string;
}

export interface CommunityComment {
  commentId: string;
  postId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export interface CreateCommunityPostRequest {
  projectId: string;
  text: string;
  imageKeys: string[];
}

export interface CreateCommunityPostResponse {
  post: CommunityPost;
  pointsAwarded: number;
  newBadges: string[];
}

export interface CommunityFeedResponse {
  posts: CommunityPost[];
  total: number;
  nextCursor?: string;
}

export interface VoteRequest {
  vote: VoteType;
}

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  currentUserVote: VoteType | null;
  pointsDelta: number;
}

export interface CreateCommentRequest {
  text: string;
}

export interface CreateCommentResponse {
  comment: CommunityComment;
}

export interface CommentsListResponse {
  comments: CommunityComment[];
  total: number;
}
