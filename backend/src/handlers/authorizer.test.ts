import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { handler } from './authorizer';
import { generateToken } from '../auth/jwt-service';

// Helper to extract statement fields from the typed union
function getStatement(result: Awaited<ReturnType<typeof handler>>) {
  const stmt = result.policyDocument.Statement[0] as {
    Action: string;
    Effect: string;
    Resource: string;
  };
  return stmt;
}

const TEST_SECRET = 'test-secret-key-for-authorizer-tests';
const TEST_METHOD_ARN =
  'arn:aws:execute-api:us-east-1:123456789:apiid/stage/GET/resource';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

function createEvent(
  authorizationToken: string,
  methodArn: string = TEST_METHOD_ARN
): APIGatewayTokenAuthorizerEvent {
  return {
    type: 'TOKEN',
    authorizationToken,
    methodArn,
  };
}

describe('Lambda Authorizer', () => {
  describe('successful authorization', () => {
    it('should return Allow policy for a valid token', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const event = createEvent(`Bearer ${token}`);
      const result = await handler(event);

      expect(result.principalId).toBe('user-123');
      expect(result.policyDocument.Version).toBe('2012-10-17');
      expect(result.policyDocument.Statement).toHaveLength(1);
      const stmt = getStatement(result);
      expect(stmt.Effect).toBe('Allow');
      expect(stmt.Action).toBe('execute-api:Invoke');
    });

    it('should pass userId, email, and role in context', async () => {
      const token = generateToken({
        userId: 'user-456',
        email: 'manager@example.com',
        role: 'manager',
      });

      const event = createEvent(`Bearer ${token}`);
      const result = await handler(event);

      expect(result.context).toEqual({
        userId: 'user-456',
        email: 'manager@example.com',
        role: 'manager',
      });
    });

    it('should wildcard the resource ARN for caching', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const event = createEvent(
        `Bearer ${token}`,
        'arn:aws:execute-api:us-east-1:123456789:apiid/prod/GET/sessions/abc'
      );
      const result = await handler(event);
      const stmt = getStatement(result);

      expect(stmt.Resource).toBe(
        'arn:aws:execute-api:us-east-1:123456789:apiid/prod/*/*'
      );
    });
  });

  describe('failed authorization', () => {
    it('should throw Unauthorized when no token is provided', async () => {
      const event = createEvent('');
      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized for Bearer with empty token', async () => {
      const event = createEvent('Bearer ');
      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized for an invalid token', async () => {
      const event = createEvent('Bearer invalid.token.here');
      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized for an expired token', async () => {
      // Manually create an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'user' },
        TEST_SECRET,
        { algorithm: 'HS256', expiresIn: '-1s' }
      );

      const event = createEvent(`Bearer ${expiredToken}`);
      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized for a token signed with wrong secret', async () => {
      const jwt = require('jsonwebtoken');
      const badToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'user' },
        'wrong-secret',
        { algorithm: 'HS256', expiresIn: '24h' }
      );

      const event = createEvent(`Bearer ${badToken}`);
      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });
  });
});
