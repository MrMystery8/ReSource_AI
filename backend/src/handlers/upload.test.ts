import { APIGatewayProxyEvent } from 'aws-lambda';

const mockSend = jest.fn();
const mockUploadFile = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockSend })),
  },
  GetCommand: jest.fn((params) => params),
}));

jest.mock('../file-store', () => ({
  FileStore: jest.fn(() => ({
    uploadFile: mockUploadFile,
  })),
}));

process.env.TABLE_NAME = 'test-sessions-table';

import { handler } from './upload';

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/upload',
    resource: '/upload',
    pathParameters: null,
    queryStringParameters: null,
    headers: {
      'content-type': 'application/json',
      'x-api-key': 'test-api-key',
    },
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariable: null,
    isBase64Encoded: false,
    body: JSON.stringify({
      file: Buffer.from('test-image-bytes').toString('base64'),
      contentType: 'image/png',
      fileName: 'evidence.png',
    }),
    requestContext: {
      authorizer: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      },
      accountId: '123456789',
      apiId: 'test-api',
      httpMethod: 'POST',
      identity: {} as any,
      path: '/upload',
      protocol: 'HTTP/1.1',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/upload',
      stage: 'prod',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('UploadHandler - POST /upload', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockUploadFile.mockReset();
    mockSend.mockResolvedValue({ Item: undefined });
    mockUploadFile.mockResolvedValue('uploads/unassociated/test-file-id.png');
  });

  it('returns 401 when the request is not authenticated', async () => {
    const event = createEvent({
      requestContext: {
        authorizer: {},
      } as any,
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error.code).toBe('AUTH_FAILURE');
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('stores the file for an authenticated request', async () => {
    const result = await handler(createEvent());

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual(
      expect.objectContaining({
        fileId: expect.any(String),
        fileName: expect.any(String),
        contentType: 'image/png',
        s3Key: expect.any(String),
      })
    );
    expect(mockUploadFile).toHaveBeenCalledWith(
      'unassociated',
      expect.any(String),
      expect.any(Buffer),
      'image/png',
      'png'
    );
  });
});
