import {
  awardSessionPoints,
  updateStreak,
  checkBadges,
  calculateLevel,
  UserStats,
} from './gamification-service';
import { TriageSession, StructuredUserContext } from '@resource-ai/shared';

// --- Test Helpers ---

const DEFAULT_USER_CONTEXT: StructuredUserContext = {
  expertiseLevel: 'Beginner',
  motivation: 'Learn Something New',
  materialAvailability: 'Basic Household Tools',
  timeCommitment: 'Under 1 Hour',
};

function makeSession(overrides: Partial<TriageSession> = {}): TriageSession {
  return {
    sessionId: 'test-session-id',
    status: 'complete',
    currentStage: null,
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
    inputs: {
      deviceIdentity: 'Old laptop',
      failureSymptoms: 'Screen broken',
      userContext: DEFAULT_USER_CONTEXT,
      fileIds: [],
    },
    stages: {
      quickVerdict: null,
      safetyGate: null,
      detailedAnalysis: null,
      reusablePartsMap: null,
      secondLifeIdeas: null,
      nextSteps: null,
      impactCard: null,
      conceptVisual: null,
    },
    error: null,
    ...overrides,
  };
}

function makeStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    points: 0,
    streak: 1,
    badges: [],
    totalSessions: 1,
    lastTriageDate: null,
    greenOutcomes: 0,
    totalSalvageableParts: 0,
    ...overrides,
  };
}

// --- awardSessionPoints ---

describe('awardSessionPoints', () => {
  it('awards base 100 points for a minimal completed session', () => {
    const session = makeSession();
    const result = awardSessionPoints(session);
    expect(result.total).toBe(100);
    expect(result.base).toBe(100);
    expect(result.photoBonus).toBe(0);
    expect(result.greenBonus).toBe(0);
    expect(result.detailedInputBonus).toBe(0);
  });

  it('awards +25 photo bonus when fileIds is non-empty', () => {
    const session = makeSession({
      inputs: {
        deviceIdentity: 'Laptop',
        failureSymptoms: 'Broken',
        userContext: DEFAULT_USER_CONTEXT,
        fileIds: ['file-1'],
      },
    });
    const result = awardSessionPoints(session);
    expect(result.photoBonus).toBe(25);
    expect(result.total).toBe(125);
  });

  it('awards +50 green bonus when safetyGate riskLevel is Green', () => {
    const session = makeSession({
      stages: {
        quickVerdict: null,
        safetyGate: {
          riskLevel: 'Green',
          identifiedHazards: [],
          doNotPerform: [],
          safeActions: [],
          stopConditions: [],
          recommendedSafeNextStep: '',
        },
        detailedAnalysis: null,
        reusablePartsMap: null,
        secondLifeIdeas: null,
        nextSteps: null,
        impactCard: null,
        conceptVisual: null,
      },
    });
    const result = awardSessionPoints(session);
    expect(result.greenBonus).toBe(50);
    expect(result.total).toBe(150);
  });

  it('awards +25 detailed input bonus when all 3 text fields > 200 chars and userContext is complete', () => {
    const longText = 'a'.repeat(201);
    const session = makeSession({
      inputs: {
        deviceIdentity: longText,
        failureSymptoms: longText,
        userContext: DEFAULT_USER_CONTEXT,
        fileIds: [],
      },
    });
    const result = awardSessionPoints(session);
    expect(result.detailedInputBonus).toBe(25);
    expect(result.total).toBe(125);
  });

  it('does not award detailed input bonus if only 2 text fields > 200 chars', () => {
    const longText = 'a'.repeat(201);
    const session = makeSession({
      inputs: {
        deviceIdentity: longText,
        failureSymptoms: 'short',
        userContext: DEFAULT_USER_CONTEXT,
        fileIds: [],
      },
    });
    const result = awardSessionPoints(session);
    expect(result.detailedInputBonus).toBe(0);
  });

  it('awards max 200 points when all bonuses apply', () => {
    const longText = 'a'.repeat(201);
    const session = makeSession({
      inputs: {
        deviceIdentity: longText,
        failureSymptoms: longText,
        userContext: DEFAULT_USER_CONTEXT,
        fileIds: ['photo-1'],
      },
      stages: {
        quickVerdict: null,
        safetyGate: {
          riskLevel: 'Green',
          identifiedHazards: [],
          doNotPerform: [],
          safeActions: [],
          stopConditions: [],
          recommendedSafeNextStep: '',
        },
        detailedAnalysis: null,
        reusablePartsMap: null,
        secondLifeIdeas: null,
        nextSteps: null,
        impactCard: null,
        conceptVisual: null,
      },
    });
    const result = awardSessionPoints(session);
    expect(result.total).toBe(200);
  });
});

// --- updateStreak ---

describe('updateStreak', () => {
  it('returns 1 when lastTriageDate is null (first session)', () => {
    expect(updateStreak(0, null)).toBe(1);
  });

  it('increments streak when last triage was within 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(updateStreak(2, threeDaysAgo)).toBe(3);
  });

  it('resets streak to 1 when last triage was more than 7 days ago', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(updateStreak(5, tenDaysAgo)).toBe(1);
  });

  it('increments streak when last triage was exactly 7 days ago', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(updateStreak(3, sevenDaysAgo)).toBe(4);
  });
});

// --- checkBadges ---

describe('checkBadges', () => {
  it('awards first-triage badge when totalSessions >= 1', () => {
    const stats = makeStats({ totalSessions: 1 });
    const session = makeSession();
    const result = checkBadges([], stats, session);
    expect(result).toContain('first-triage');
  });

  it('awards regular-recycler badge when totalSessions >= 5', () => {
    const stats = makeStats({ totalSessions: 5 });
    const session = makeSession();
    const result = checkBadges([], stats, session);
    expect(result).toContain('regular-recycler');
  });

  it('awards hazard-spotter badge when session riskLevel is Red', () => {
    const stats = makeStats();
    const session = makeSession({
      stages: {
        quickVerdict: null,
        safetyGate: {
          riskLevel: 'Red',
          identifiedHazards: ['Battery leak'],
          doNotPerform: [],
          safeActions: [],
          stopConditions: [],
          recommendedSafeNextStep: '',
        },
        detailedAnalysis: null,
        reusablePartsMap: null,
        secondLifeIdeas: null,
        nextSteps: null,
        impactCard: null,
        conceptVisual: null,
      },
    });
    const result = checkBadges([], stats, session);
    expect(result).toContain('hazard-spotter');
  });

  it('awards parts-hunter badge when totalSalvageableParts >= 10', () => {
    const stats = makeStats({ totalSalvageableParts: 10 });
    const session = makeSession();
    const result = checkBadges([], stats, session);
    expect(result).toContain('parts-hunter');
  });

  it('awards streak-master badge when streak >= 4', () => {
    const stats = makeStats({ streak: 4 });
    const session = makeSession();
    const result = checkBadges([], stats, session);
    expect(result).toContain('streak-master');
  });

  it('awards green-champion badge when greenOutcomes >= 5', () => {
    const stats = makeStats({ greenOutcomes: 5 });
    const session = makeSession();
    const result = checkBadges([], stats, session);
    expect(result).toContain('green-champion');
  });

  it('does not re-award badges already earned', () => {
    const stats = makeStats({ totalSessions: 10, streak: 5, greenOutcomes: 6 });
    const session = makeSession();
    const existingBadges = ['first-triage', 'regular-recycler', 'streak-master', 'green-champion'];
    const result = checkBadges(existingBadges, stats, session);
    expect(result).not.toContain('first-triage');
    expect(result).not.toContain('regular-recycler');
    expect(result).not.toContain('streak-master');
    expect(result).not.toContain('green-champion');
  });

  it('returns empty array when no new badges are earned', () => {
    const stats = makeStats({ totalSessions: 1 });
    const session = makeSession();
    const result = checkBadges(['first-triage'], stats, session);
    expect(result).toEqual([]);
  });
});

// --- calculateLevel ---

describe('calculateLevel', () => {
  it('returns Recycler for 0 points', () => {
    expect(calculateLevel(0)).toBe('Recycler');
  });

  it('returns Recycler for 499 points', () => {
    expect(calculateLevel(499)).toBe('Recycler');
  });

  it('returns Salvager for 500 points', () => {
    expect(calculateLevel(500)).toBe('Salvager');
  });

  it('returns Salvager for 1499 points', () => {
    expect(calculateLevel(1499)).toBe('Salvager');
  });

  it('returns E-Waste Champion for 1500 points', () => {
    expect(calculateLevel(1500)).toBe('E-Waste Champion');
  });

  it('returns E-Waste Champion for 3999 points', () => {
    expect(calculateLevel(3999)).toBe('E-Waste Champion');
  });

  it('returns Green Guardian for 4000 points', () => {
    expect(calculateLevel(4000)).toBe('Green Guardian');
  });

  it('returns Green Guardian for very high points', () => {
    expect(calculateLevel(100000)).toBe('Green Guardian');
  });
});
