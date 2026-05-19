// ============================================================
// ReSource AI E-Waste Triage - Shared Constants
// ============================================================

import { PipelineStageConfig, ExpertiseLevel, SkillLevel } from './types';

// --- Pipeline Stage Configuration ---

export const PIPELINE_STAGES: readonly PipelineStageConfig[] = [
  { key: 'quickVerdict', name: 'Quick ReSource Verdict', type: 'text' },
  { key: 'safetyGate', name: 'Safety Gate', type: 'text' },
  { key: 'detailedAnalysis', name: 'Detailed Resource Analysis', type: 'text' },
  { key: 'secondLifeIdeas', name: 'Safe Second Life Ideas', type: 'text' },
  { key: 'nextSteps', name: 'Safe Next Steps and Recovery Route', type: 'text' },
] as const;

// --- Timeout Values ---

export const PIPELINE_TIMEOUT_MS = 170_000;
export const STAGE_SOFT_TIMEOUT_MS = 30_000;
export const BEDROCK_REQUEST_TIMEOUT_MS = 60_000;
export const BEDROCK_RETRY_DELAY_MS = 2_000;

// DynamoDB retry backoff intervals (ms)
export const DYNAMODB_RETRY_DELAYS_MS = [100, 200, 400] as const;
export const DYNAMODB_MAX_RETRIES = 3;

// --- Validation Limits ---

export const MAX_INPUT_LENGTH = 5_000;
export const MAX_FIELD_LENGTH = 2_000;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_SESSION = 5;
export const MIN_EVIDENCE_CHAR_THRESHOLD = 50;

// --- Session Configuration ---

export const SESSION_TTL_HOURS = 24 * 365; // 1 year
export const PRESIGNED_URL_EXPIRY_SECONDS = 3_600; // 1 hour

// --- Allowed File Types ---

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/html',
  'text/csv',
  'application/json',
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.docx',
  '.pptx',
  '.html',
  '.csv',
  '.json',
] as const;

export const ALLOWED_CONTENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const;

// --- Output Constraints ---

export const MAX_DETAILED_ANALYSIS_WORDS = 350;
export const MAX_VERDICT_SUMMARY_WORDS = 30;
export const MAX_SECOND_LIFE_IDEA_WORDS = 90;
export const MAX_NEXT_STEPS_WORDS = 300;
export const SECOND_LIFE_IDEAS_COUNT = 7;

// --- Risk Level Ordering (for escalation logic) ---

export const RISK_LEVEL_ORDER = ['Green', 'Yellow', 'Orange', 'Red'] as const;

// --- Gamification Constants ---

export const LEVEL_THRESHOLDS = [
  { level: 'Recycler' as const, minPoints: 0, maxPoints: 499 },
  { level: 'Eco-Sorter' as const, minPoints: 500, maxPoints: 1499 },
  { level: 'Resource Salvager' as const, minPoints: 1500, maxPoints: 3499 },
  { level: 'Triage Specialist' as const, minPoints: 3500, maxPoints: 6999 },
  { level: 'E-Waste Champion' as const, minPoints: 7000, maxPoints: 11999 },
  { level: 'Green Guardian' as const, minPoints: 12000, maxPoints: 19999 },
  { level: 'Eco-Legend' as const, minPoints: 20000, maxPoints: Infinity },
] as const;

export const POINTS_CONFIG = {
  base: 100,
  photoBonus: 25,
  greenBonus: 50,
  detailedInputBonus: 25,
} as const;

export const BADGE_DEFINITIONS = [
  { id: 'first-triage', name: 'First Triage', description: 'Complete your first triage', icon: '🌱' },
  { id: 'regular-recycler', name: 'Regular Recycler', description: 'Complete 5 triages', icon: '♻️' },
  { id: 'hazard-spotter', name: 'Hazard Spotter', description: 'Submit a Red-risk device', icon: '⚠️' },
  { id: 'parts-hunter', name: 'Parts Hunter', description: 'Find 10+ salvageable parts', icon: '🔧' },
  { id: 'streak-master', name: 'Streak Master', description: 'Maintain a 4-week streak', icon: '🔥' },
  { id: 'green-champion', name: 'Green Champion', description: '5 Green-risk outcomes', icon: '🌿' },
  { id: 'community-starter', name: 'Community Starter', description: 'Share your first project to the community', icon: '📢' },
  { id: 'popular-creator', name: 'Popular Creator', description: 'Get 10 upvotes on a single post', icon: '⭐' },
  { id: 'conversation-spark', name: 'Conversation Spark', description: 'Receive 5 comments on a post', icon: '💬' },
  { id: 'community-pillar', name: 'Community Pillar', description: 'Share 10 projects to the community', icon: '🏛️' },
  { id: 'helpful-neighbor', name: 'Helpful Neighbor', description: 'Leave 20 comments on others\' posts', icon: '🤝' },
  // New Triage & Safety Badges
  { id: 'safety-sentinel', name: 'Safety Sentinel', description: 'Triage 5 Yellow/Orange-risk devices safely', icon: '🛡️' },
  { id: 'triage-titan', name: 'Triage Titan', description: 'Complete 20 triage sessions', icon: '📊' },
  { id: 'hazard-hero', name: 'Hazard Hero', description: 'Triage 5 Red-risk devices safely', icon: '🚨' },
  // New Project Craftsmanship Badges
  { id: 'first-project', name: 'First Project', description: 'Complete your first second-life project', icon: '🛠️' },
  { id: 'grade-a-artisan', name: 'Grade A Artisan', description: 'Get an A grade on a submitted project', icon: '🏆' },
  { id: 'recycling-architect', name: 'Recycling Architect', description: 'Complete 5 second-life projects', icon: '🏗️' },
  { id: 'master-craftsman', name: 'Master Craftsman', description: 'Complete 10 second-life projects', icon: '👑' },
  // New Community Engagement Badges
  { id: 'upvote-magnet', name: 'Upvote Magnet', description: 'Receive 50 upvotes across shared projects', icon: '🧲' },
  { id: 'active-discussant', name: 'Active Discussant', description: 'Leave 50 comments on others\' posts', icon: '🗣️' },
] as const;

// --- Community Gamification Constants ---

export const COMMUNITY_POINTS = {
  sharePost: 75,
  receiveUpvote: 10,
  receiveDownvote: -5,
  leaveComment: 5,
} as const;

// --- Project Grading Constants ---

export const PROJECT_GRADE_POINTS: Record<string, number> = {
  A: 500,
  B: 350,
  C: 200,
  D: 100,
  F: 25,
};

export const EXPERTISE_LEVEL_ORDER: Record<ExpertiseLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Expert: 3,
};

export const IDEA_SKILL_TO_EXPERTISE: Record<SkillLevel, ExpertiseLevel> = {
  Beginner: 'Beginner',
  Intermediate: 'Intermediate',
  Advanced: 'Expert',
  Professional: 'Expert',
};
