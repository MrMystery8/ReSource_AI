import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './auth';
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '@resource-ai/shared';

// Mock the UserStore
jest.mock('../auth/user-store', () => {
  const mockGetUserById = jest.fn();
  return {
    UserStore: jest.fn().mockImplementation(() => ({
      getUserById: mockGetUserById,
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
    })),
    __mockGetUserById: mockGetUserById,
  };
});

// Mock password and jwt services (not needed for stats but imported by auth handler)
jest.mock('../auth/password-service', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('../auth/jwt-service', () => ({
  generateToken: jest.fn(),
}));

const { __mockGetUserById } = jest.requireMock('../auth/user-store');

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/auth/stats',
    resource: '/auth/stats',
    body: null,
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    isBase64Encoded: false,
    requestContext: {
      authorizer: { userId: 'user-123' },
      accountId: '',
      apiId: '',
      httpMethod: 'GET',
      identity: {} as any,
      path: '/auth/stats',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('GET /auth/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no userId in authorizer context', async () => {
    const event = makeEvent({
      requestContext: {
        authorizer: {},
      } as any,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(401);
  });

  it('returns 401 when user not found in database', async () => {
    __mockGetUserById.mockResolvedValue(null);
    const event = makeEvent();

    const result = await handler(event);
    expect(result.statusCode).toBe(401);
  });

  it('returns stats with defaults for a new user (no gamification fields)', async () => {
    __mockGetUserById.mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hash',
      displayName: 'Test User',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });

    const event = makeEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.points).toBe(0);
    expect(body.level).toBe('Recycler');
    expect(body.streak).toBe(0);
    expect(body.totalSessions).toBe(0);
    expect(body.lastTriageDate).toBeNull();
    expect(body.pointsToNextLevel).toBe(500);
    expect(body.nextLevel).toBe('Salvager');
    expect(body.badges).toHaveLength(BADGE_DEFINITIONS.length);
    // All badges should be unearned (earnedAt = null)
    body.badges.forEach((badge: any) => {
      expect(badge.earnedAt).toBeNull();
    });
  });

  it('returns correct stats for a user with gamification data', async () => {
    __mockGetUserById.mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hash',
      displayName: 'Test User',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
      points: 750,
      level: 'Salvager',
      streak: 3,
      badges: ['first-triage', 'regular-recycler'],
      totalSessions: 7,
      lastTriageDate: '2024-06-01T00:00:00.000Z',
    });

    const event = makeEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.points).toBe(750);
    expect(body.level).toBe('Salvager');
    expect(body.streak).toBe(3);
    expect(body.totalSessions).toBe(7);
    expect(body.lastTriageDate).toBe('2024-06-01T00:00:00.000Z');
    // Next level is E-Waste Champion at 1500 points
    expect(body.pointsToNextLevel).toBe(750); // 1500 - 750
    expect(body.nextLevel).toBe('E-Waste Champion');

    // Check badges
    expect(body.badges).toHaveLength(BADGE_DEFINITIONS.length);
    const firstTriage = body.badges.find((b: any) => b.id === 'first-triage');
    expect(firstTriage.earnedAt).not.toBeNull();
    const regularRecycler = body.badges.find((b: any) => b.id === 'regular-recycler');
    expect(regularRecycler.earnedAt).not.toBeNull();
    const hazardSpotter = body.badges.find((b: any) => b.id === 'hazard-spotter');
    expect(hazardSpotter.earnedAt).toBeNull();
  });

  it('returns pointsToNextLevel=0 and nextLevel=null for max level user', async () => {
    __mockGetUserById.mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hash',
      displayName: 'Green Master',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
      points: 5000,
      level: 'Green Guardian',
      streak: 10,
      badges: ['first-triage', 'regular-recycler', 'streak-master', 'green-champion'],
      totalSessions: 50,
      lastTriageDate: '2024-06-01T00:00:00.000Z',
    });

    const event = makeEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.points).toBe(5000);
    expect(body.level).toBe('Green Guardian');
    expect(body.pointsToNextLevel).toBe(0);
    expect(body.nextLevel).toBeNull();
  });

  it('includes full badge info (id, name, description, icon) for all badges', async () => {
    __mockGetUserById.mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hash',
      displayName: 'Test User',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      points: 0,
      badges: [],
    });

    const event = makeEvent();
    const result = await handler(event);
    const body = JSON.parse(result.body);

    // Verify each badge has the expected fields from BADGE_DEFINITIONS
    BADGE_DEFINITIONS.forEach((def) => {
      const badge = body.badges.find((b: any) => b.id === def.id);
      expect(badge).toBeDefined();
      expect(badge.name).toBe(def.name);
      expect(badge.description).toBe(def.description);
      expect(badge.icon).toBe(def.icon);
    });
  });
});
