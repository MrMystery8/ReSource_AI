// ============================================================
// ReSource AI E-Waste Triage - Shared Constants
// ============================================================

import { PipelineStageConfig } from './types';

// --- Pipeline Stage Configuration ---

export const PIPELINE_STAGES: readonly PipelineStageConfig[] = [
  { key: 'quickVerdict', name: 'Quick ReSource Verdict', type: 'text' },
  { key: 'safetyGate', name: 'Safety Gate', type: 'text' },
  { key: 'detailedAnalysis', name: 'Detailed Resource Analysis', type: 'text' },
  { key: 'reusablePartsMap', name: 'Reusable Parts Map', type: 'text' },
  { key: 'secondLifeIdeas', name: 'Safe Second Life Ideas', type: 'text' },
  { key: 'nextSteps', name: 'Safe Next Steps and Recovery Route', type: 'text' },
  { key: 'impactCard', name: 'ReSource Impact Card', type: 'text' },
  { key: 'conceptVisual', name: 'ReSource Concept Visual', type: 'image' },
] as const;

// --- Timeout Values ---

export const PIPELINE_TIMEOUT_MS = 120_000;
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

export const SESSION_TTL_HOURS = 24;
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
export const MAX_IMPACT_CARD_TOTAL_WORDS = 120;
export const MAX_IMPACT_CARD_FIELD_WORDS = 15;
export const REUSABLE_PARTS_MIN_ROWS = 6;
export const REUSABLE_PARTS_MAX_ROWS = 10;
export const SECOND_LIFE_IDEAS_COUNT = 3;

// --- Risk Level Ordering (for escalation logic) ---

export const RISK_LEVEL_ORDER = ['Green', 'Yellow', 'Orange', 'Red'] as const;
