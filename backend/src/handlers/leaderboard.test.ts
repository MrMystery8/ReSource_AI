import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock environment must be set before importing handler
process.env.USERS_TABLE_NAME = 'test-users-table';

// Mock DynamoDB - use jest.fn at module scope via hoisting
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({ send: (...args: any[]) => mockSend(...args) })),
    },
    ScanCommand: jest.fn((params: any) => ({ ...params, _type: 'ScanCommand' })),
  };
});

import { handler } from './leaderboard';

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/leaderboard',
    resource: '/leaderboard',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        userId: 'user-123',
      },
      accountId: '',
      apiId: '',
      httpMethod: 'GET',
      identity: {} as any,
      path: '/leaderboard',
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

describe('LeaderboardHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when userId is not in authorizer context', async () => {
    const event = createEvent({
      requestContext: {
        authorizer: {},
      } as any,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('AUTH_FAILURE');
  });

  it('returns top 20 users sorted by points descending', async () => {
    // Create 25 users with varying points
    const users = Array.from({ length: 25 }, (_, i) => ({
      userId: `user-${i}`,
      displayName: `User ${i}`,
      points: i * 100,
      badges: i > 10 ? ['first-triage', 'regular-recycler'] : ['first-triage'],
    }));

    mockSend.mockResolvedValueOnce({
      Items: users,
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    // Should return exactly 20 entries
    expect(body.entries).toHaveLength(20);

    // First entry should be the user with highest points (user-24, 2400 points)
    expect(body.entries[0].rank).toBe(1);
    expect(body.entries[0].displayName).toBe('User 24');
    expect(body.entries[0].points).toBe(2400);
    expect(body.entries[0].level).toBe('Resource Salvager');
    expect(body.entries[0].badgeCount).toBe(2);

    // Entries should be sorted by points descending
    for (let i = 1; i < body.entries.length; i++) {
      expect(body.entries[i].points).toBeLessThanOrEqual(body.entries[i - 1].points);
    }
  });

  it('marks the current user with isCurrentUser: true', async () => {
    const users = [
      { userId: 'user-1', displayName: 'Alice', points: 500, badges: [] },
      { userId: 'user-123', displayName: 'Current User', points: 300, badges: ['first-triage'] },
      { userId: 'user-2', displayName: 'Bob', points: 100, badges: [] },
    ];

    mockSend.mockResolvedValueOnce({
      Items: users,
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    const currentUserEntry = body.entries.find((e: any) => e.isCurrentUser);
    expect(currentUserEntry).toBeDefined();
    expect(currentUserEntry.displayName).toBe('Current User');
    expect(currentUserEntry.rank).toBe(2);
    expect(currentUserEntry.badgeCount).toBe(1);
  });

  it('includes currentUserRank even if user is not in top 20', async () => {
    // Create 25 users, current user has lowest points
    const users = Array.from({ length: 25 }, (_, i) => ({
      userId: i === 24 ? 'user-123' : `user-${i}`,
      displayName: i === 24 ? 'Current User' : `User ${i}`,
      points: i === 24 ? 0 : (25 - i) * 100,
      badges: [],
    }));

    mockSend.mockResolvedValueOnce({
      Items: users,
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    // Current user should be ranked 25th (last)
    expect(body.currentUserRank).toBe(25);

    // Current user should NOT be in the top 20 entries
    const currentUserInEntries = body.entries.find((e: any) => e.isCurrentUser);
    expect(currentUserInEntries).toBeUndefined();
  });

  it('handles users with no points (defaults to 0)', async () => {
    const users = [
      { userId: 'user-1', displayName: 'Alice', points: 500, badges: ['first-triage'] },
      { userId: 'user-123', displayName: 'New User' }, // No points or badges fields
    ];

    mockSend.mockResolvedValueOnce({
      Items: users,
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.entries).toHaveLength(2);
    // User with no points should be last
    expect(body.entries[1].points).toBe(0);
    expect(body.entries[1].badgeCount).toBe(0);
    expect(body.entries[1].level).toBe('Recycler');
  });

  it('handles paginated scan results', async () => {
    // First scan page
    mockSend.mockResolvedValueOnce({
      Items: [
        { userId: 'user-1', displayName: 'Alice', points: 500, badges: [] },
      ],
      LastEvaluatedKey: { userId: 'user-1' },
    });

    // Second scan page
    mockSend.mockResolvedValueOnce({
      Items: [
        { userId: 'user-123', displayName: 'Current User', points: 1000, badges: ['first-triage'] },
      ],
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.entries).toHaveLength(2);
    // Higher points first
    expect(body.entries[0].displayName).toBe('Current User');
    expect(body.entries[0].points).toBe(1000);
    expect(body.currentUserRank).toBe(1);
  });

  it('returns currentUserRank as null if user not found in table', async () => {
    const users = [
      { userId: 'user-other', displayName: 'Other', points: 500, badges: [] },
    ];

    mockSend.mockResolvedValueOnce({
      Items: users,
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.currentUserRank).toBeNull();
  });

  it('returns 500 on DynamoDB error', async () => {
    mockSend.mockRejectedValueOnce(new Error('DynamoDB connection failed'));

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('calculates correct levels based on points', async () => {
    const users = [
      { userId: 'user-1', displayName: 'Guardian', points: 12000, badges: [] },
      { userId: 'user-2', displayName: 'Champion', points: 7000, badges: [] },
      { userId: 'user-3', displayName: 'Salvager', points: 1500, badges: [] },
      { userId: 'user-123', displayName: 'Recycler', points: 100, badges: [] },
    ];
 
    mockSend.mockResolvedValueOnce({
      Items: users,
      LastEvaluatedKey: undefined,
    });
 
    const event = createEvent();
    const result = await handler(event);
 
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
 
    expect(body.entries[0].level).toBe('Green Guardian');
    expect(body.entries[1].level).toBe('E-Waste Champion');
    expect(body.entries[2].level).toBe('Resource Salvager');
    expect(body.entries[3].level).toBe('Recycler');
  });
});
