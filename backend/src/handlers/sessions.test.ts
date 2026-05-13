import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserSessionsResponse } from '@resource-ai/shared';

// Mock DynamoDB
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockSend })),
  },
  QueryCommand: jest.fn((params) => params),
}));

// Set env before importing handler
process.env.TABLE_NAME = 'test-sessions-table';

import { handler } from './sessions';

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/sessions',
    resource: '/sessions',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariable: null,
    isBase64Encoded: false,
    body: null,
    requestContext: {
      authorizer: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      },
      accountId: '123456789',
      apiId: 'test-api',
      httpMethod: 'GET',
      identity: {} as any,
      path: '/sessions',
      protocol: 'HTTP/1.1',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/sessions',
      stage: 'prod',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('SessionsHandler - GET /sessions', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should return 401 when userId is not in authorizer context', async () => {
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

  it('should return paginated sessions for authenticated user', async () => {
    const mockSessions = [
      {
        sessionId: 'session-1',
        userId: 'user-123',
        status: 'complete',
        createdAt: '2024-01-15T10:00:00Z',
        inputs: { deviceIdentity: 'iPhone 12', failureSymptoms: '', userContext: '', fileIds: [] },
        stages: {
          quickVerdict: { deviceIdentification: 'iPhone 12', salvageScore: 7, riskLevel: 'Green' },
          safetyGate: { riskLevel: 'Green' },
        },
      },
      {
        sessionId: 'session-2',
        userId: 'user-123',
        status: 'processing',
        createdAt: '2024-01-14T10:00:00Z',
        inputs: { deviceIdentity: 'Samsung Galaxy S21', failureSymptoms: '', userContext: '', fileIds: [] },
        stages: {
          quickVerdict: null,
          safetyGate: null,
        },
      },
    ];

    // First call: COUNT query
    mockSend.mockResolvedValueOnce({ Count: 2 });
    // Second call: data query
    mockSend.mockResolvedValueOnce({ Items: mockSessions, LastEvaluatedKey: undefined });

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body: UserSessionsResponse = JSON.parse(result.body);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(0);
    expect(body.sessions).toHaveLength(2);

    // First session should have extracted data
    expect(body.sessions[0].sessionId).toBe('session-1');
    expect(body.sessions[0].deviceName).toBe('iPhone 12');
    expect(body.sessions[0].riskLevel).toBe('Green');
    expect(body.sessions[0].salvageScore).toBe(7);
    expect(body.sessions[0].status).toBe('complete');

    // Second session (processing) should fallback to input deviceIdentity
    expect(body.sessions[1].sessionId).toBe('session-2');
    expect(body.sessions[1].deviceName).toBe('Samsung Galaxy S21');
    expect(body.sessions[1].riskLevel).toBeNull();
    expect(body.sessions[1].salvageScore).toBeNull();
  });

  it('should use default pagination (limit=10, offset=0)', async () => {
    mockSend.mockResolvedValueOnce({ Count: 0 });

    const event = createEvent();
    await handler(event);

    // The count query should use the userId-index
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-sessions-table',
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': 'user-123' },
        Select: 'COUNT',
      })
    );
  });

  it('should respect custom limit and offset query params', async () => {
    mockSend.mockResolvedValueOnce({ Count: 0 });

    const event = createEvent({
      queryStringParameters: { limit: '5', offset: '10' },
    });

    const result = await handler(event);
    const body: UserSessionsResponse = JSON.parse(result.body);

    expect(body.limit).toBe(5);
    expect(body.offset).toBe(10);
  });

  it('should cap limit at 100', async () => {
    mockSend.mockResolvedValueOnce({ Count: 0 });

    const event = createEvent({
      queryStringParameters: { limit: '500' },
    });

    const result = await handler(event);
    const body: UserSessionsResponse = JSON.parse(result.body);

    expect(body.limit).toBe(100);
  });

  it('should return empty sessions when offset exceeds total', async () => {
    mockSend.mockResolvedValueOnce({ Count: 5 });

    const event = createEvent({
      queryStringParameters: { offset: '10' },
    });

    const result = await handler(event);
    const body: UserSessionsResponse = JSON.parse(result.body);

    expect(body.sessions).toHaveLength(0);
    expect(body.total).toBe(5);
  });

  it('should sort by createdAt descending (ScanIndexForward: false)', async () => {
    mockSend.mockResolvedValueOnce({ Count: 1 });
    mockSend.mockResolvedValueOnce({
      Items: [{
        sessionId: 'session-1',
        userId: 'user-123',
        status: 'complete',
        createdAt: '2024-01-15T10:00:00Z',
        inputs: { deviceIdentity: 'Test Device' },
        stages: { quickVerdict: null, safetyGate: null },
      }],
      LastEvaluatedKey: undefined,
    });

    const event = createEvent();
    await handler(event);

    // The data query should use ScanIndexForward: false
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-sessions-table',
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ScanIndexForward: false,
      })
    );
  });

  it('should handle DynamoDB errors gracefully', async () => {
    mockSend.mockRejectedValueOnce(new Error('DynamoDB connection error'));

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should extract deviceName from quickVerdict when available', async () => {
    mockSend.mockResolvedValueOnce({ Count: 1 });
    mockSend.mockResolvedValueOnce({
      Items: [{
        sessionId: 'session-1',
        userId: 'user-123',
        status: 'complete',
        createdAt: '2024-01-15T10:00:00Z',
        inputs: { deviceIdentity: 'Input Device Name' },
        stages: {
          quickVerdict: { deviceIdentification: 'AI Identified Device', salvageScore: 8 },
          safetyGate: { riskLevel: 'Yellow' },
        },
      }],
    });

    const event = createEvent();
    const result = await handler(event);
    const body: UserSessionsResponse = JSON.parse(result.body);

    // Should prefer quickVerdict.deviceIdentification over inputs.deviceIdentity
    expect(body.sessions[0].deviceName).toBe('AI Identified Device');
    expect(body.sessions[0].riskLevel).toBe('Yellow');
    expect(body.sessions[0].salvageScore).toBe(8);
  });

  it('should fallback to "Unknown Device" when no device info is available', async () => {
    mockSend.mockResolvedValueOnce({ Count: 1 });
    mockSend.mockResolvedValueOnce({
      Items: [{
        sessionId: 'session-1',
        userId: 'user-123',
        status: 'processing',
        createdAt: '2024-01-15T10:00:00Z',
        stages: { quickVerdict: null, safetyGate: null },
      }],
    });

    const event = createEvent();
    const result = await handler(event);
    const body: UserSessionsResponse = JSON.parse(result.body);

    expect(body.sessions[0].deviceName).toBe('Unknown Device');
  });
});
