import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  TriageSession,
  UserLevel,
  POINTS_CONFIG,
  LEVEL_THRESHOLDS,
} from '@resource-ai/shared';

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// --- Internal Types ---

export interface UserStats {
  points: number;
  streak: number;
  badges: string[];
  totalSessions: number;
  lastTriageDate: string | null;
  greenOutcomes: number;
  totalSalvageableParts: number;
}

export interface PointsResult {
  total: number;
  base: number;
  photoBonus: number;
  greenBonus: number;
  detailedInputBonus: number;
}

export interface GamificationResult {
  pointsEarned: PointsResult;
  newBadges: string[];
  newLevel: UserLevel;
  newStreak: number;
}

// --- Helper: Extract risk level from session ---

function getSessionRiskLevel(session: TriageSession): string | null {
  // Use safetyGate riskLevel as the authoritative risk level
  return session.stages.safetyGate?.riskLevel ?? null;
}

// --- Helper: Count salvageable parts from this session ---

function countSalvageableParts(session: TriageSession): number {
  const partsMap = session.stages.reusablePartsMap;
  if (!partsMap || !partsMap.parts) return 0;
  return partsMap.parts.filter((p) => p.verdict === 'Salvage').length;
}

// --- Helper: Check if all 3 text input fields exceed 200 chars ---

function hasDetailedInput(session: TriageSession): boolean {
  const { deviceIdentity, failureSymptoms, userContext } = session.inputs;
  return (
    deviceIdentity.length > 200 &&
    failureSymptoms.length > 200 &&
    userContext.length > 200
  );
}

// --- Core Functions ---

/**
 * Calculates points earned for a completed session.
 * Base 100 + bonuses for photos, green risk, and detailed input.
 */
export function awardSessionPoints(session: TriageSession): PointsResult {
  const base = POINTS_CONFIG.base;
  const photoBonus = session.inputs.fileIds.length > 0 ? POINTS_CONFIG.photoBonus : 0;
  const greenBonus = getSessionRiskLevel(session) === 'Green' ? POINTS_CONFIG.greenBonus : 0;
  const detailedInputBonus = hasDetailedInput(session) ? POINTS_CONFIG.detailedInputBonus : 0;

  return {
    total: base + photoBonus + greenBonus + detailedInputBonus,
    base,
    photoBonus,
    greenBonus,
    detailedInputBonus,
  };
}

/**
 * Updates the streak based on the last triage date and current streak.
 * Increments if last triage was within 7 days, resets to 1 otherwise.
 * If lastTriageDate is null (first session), starts at 1.
 */
export function updateStreak(currentStreak: number, lastTriageDate: string | null): number {
  if (!lastTriageDate) {
    return 1;
  }

  const lastDate = new Date(lastTriageDate);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) {
    return currentStreak + 1;
  }

  return 1;
}

/**
 * Checks badge criteria against updated stats and session data.
 * Returns array of newly earned badge IDs (not previously in user's badges).
 */
export function checkBadges(
  currentBadges: string[],
  stats: UserStats,
  session: TriageSession
): string[] {
  const newBadges: string[] = [];

  const riskLevel = getSessionRiskLevel(session);

  // Check each badge criterion
  if (!currentBadges.includes('first-triage') && stats.totalSessions >= 1) {
    newBadges.push('first-triage');
  }

  if (!currentBadges.includes('regular-recycler') && stats.totalSessions >= 5) {
    newBadges.push('regular-recycler');
  }

  if (!currentBadges.includes('hazard-spotter') && riskLevel === 'Red') {
    newBadges.push('hazard-spotter');
  }

  if (!currentBadges.includes('parts-hunter') && stats.totalSalvageableParts >= 10) {
    newBadges.push('parts-hunter');
  }

  if (!currentBadges.includes('streak-master') && stats.streak >= 4) {
    newBadges.push('streak-master');
  }

  if (!currentBadges.includes('green-champion') && stats.greenOutcomes >= 5) {
    newBadges.push('green-champion');
  }

  return newBadges;
}

/**
 * Maps total points to a level tier.
 */
export function calculateLevel(points: number): UserLevel {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (points >= threshold.minPoints && points <= threshold.maxPoints) {
      return threshold.level;
    }
  }
  // Default fallback (should not happen with Infinity maxPoints)
  return 'Recycler';
}

/**
 * Orchestrates the full gamification flow after a session completes:
 * 1. Get user's current stats from DynamoDB
 * 2. Calculate points for this session
 * 3. Update streak based on lastTriageDate
 * 4. Increment totalSessions
 * 5. Update greenOutcomes if this session was Green
 * 6. Update totalSalvageableParts from componentSalvage stage
 * 7. Check all badge criteria against updated stats
 * 8. Calculate new level from new total points
 * 9. Write all updates back to DynamoDB
 * 10. Return the result
 */
export async function processSessionCompletion(
  userId: string,
  session: TriageSession
): Promise<GamificationResult> {
  // 1. Get user's current gamification stats from DynamoDB
  const userResult = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
    })
  );

  const userRecord = userResult.Item ?? {};

  const currentStats: UserStats = {
    points: userRecord.points ?? 0,
    streak: userRecord.streak ?? 0,
    badges: userRecord.badges ?? [],
    totalSessions: userRecord.totalSessions ?? 0,
    lastTriageDate: userRecord.lastTriageDate ?? null,
    greenOutcomes: userRecord.greenOutcomes ?? 0,
    totalSalvageableParts: userRecord.totalSalvageableParts ?? 0,
  };

  // 2. Calculate points for this session
  const pointsResult = awardSessionPoints(session);

  // 3. Update streak based on lastTriageDate
  const newStreak = updateStreak(currentStats.streak, currentStats.lastTriageDate);

  // 4. Increment totalSessions
  const newTotalSessions = currentStats.totalSessions + 1;

  // 5. Update greenOutcomes if this session was Green
  const riskLevel = getSessionRiskLevel(session);
  const newGreenOutcomes = riskLevel === 'Green'
    ? currentStats.greenOutcomes + 1
    : currentStats.greenOutcomes;

  // 6. Update totalSalvageableParts from reusablePartsMap stage
  const sessionSalvageableParts = countSalvageableParts(session);
  const newTotalSalvageableParts = currentStats.totalSalvageableParts + sessionSalvageableParts;

  // 7. Build updated stats for badge checking
  const updatedStats: UserStats = {
    points: currentStats.points + pointsResult.total,
    streak: newStreak,
    badges: currentStats.badges,
    totalSessions: newTotalSessions,
    lastTriageDate: new Date().toISOString(),
    greenOutcomes: newGreenOutcomes,
    totalSalvageableParts: newTotalSalvageableParts,
  };

  // Check all badge criteria against updated stats
  const newBadges = checkBadges(currentStats.badges, updatedStats, session);
  const allBadges = [...currentStats.badges, ...newBadges];

  // 8. Calculate new level from new total points
  const newLevel = calculateLevel(updatedStats.points);

  // 9. Write all updates back to DynamoDB
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
      UpdateExpression: `SET #points = :points, #level = :level, #streak = :streak, 
        #badges = :badges, #lastTriageDate = :lastTriageDate, 
        #totalSessions = :totalSessions, #greenOutcomes = :greenOutcomes, 
        #totalSalvageableParts = :totalSalvageableParts, #updatedAt = :updatedAt`,
      ExpressionAttributeNames: {
        '#points': 'points',
        '#level': 'level',
        '#streak': 'streak',
        '#badges': 'badges',
        '#lastTriageDate': 'lastTriageDate',
        '#totalSessions': 'totalSessions',
        '#greenOutcomes': 'greenOutcomes',
        '#totalSalvageableParts': 'totalSalvageableParts',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':points': updatedStats.points,
        ':level': newLevel,
        ':streak': newStreak,
        ':badges': allBadges,
        ':lastTriageDate': updatedStats.lastTriageDate,
        ':totalSessions': newTotalSessions,
        ':greenOutcomes': newGreenOutcomes,
        ':totalSalvageableParts': newTotalSalvageableParts,
        ':updatedAt': new Date().toISOString(),
      },
    })
  );

  // 10. Return the result
  return {
    pointsEarned: pointsResult,
    newBadges,
    newLevel,
    newStreak,
  };
}
