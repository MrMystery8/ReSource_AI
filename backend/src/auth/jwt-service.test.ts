import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, TokenInput } from './jwt-service';

const TEST_SECRET = 'test-secret-key-for-jwt-service-tests';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

describe('JwtService', () => {
  const validPayload: TokenInput = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateToken', () => {
    it('should return a valid JWT string', () => {
      const token = generateToken(validPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should encode userId, email, and role in the payload', () => {
      const token = generateToken(validPayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.role).toBe(validPayload.role);
    });

    it('should set expiry to 24 hours from issuance', () => {
      const token = generateToken(validPayload);
      const decoded = jwt.decode(token) as { iat: number; exp: number };
      const twentyFourHoursInSeconds = 24 * 60 * 60;
      expect(decoded.exp - decoded.iat).toBe(twentyFourHoursInSeconds);
    });

    it('should use HS256 algorithm', () => {
      const token = generateToken(validPayload);
      const header = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64url').toString()
      );
      expect(header.alg).toBe('HS256');
    });

    it('should generate tokens for manager role', () => {
      const managerPayload: TokenInput = { ...validPayload, role: 'manager' };
      const token = generateToken(managerPayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.role).toBe('manager');
    });
  });

  describe('verifyToken', () => {
    it('should return the decoded payload for a valid token', () => {
      const token = generateToken(validPayload);
      const result = verifyToken(token);
      expect(result.userId).toBe(validPayload.userId);
      expect(result.email).toBe(validPayload.email);
      expect(result.role).toBe(validPayload.role);
      expect(typeof result.iat).toBe('number');
      expect(typeof result.exp).toBe('number');
    });

    it('should throw on an expired token', () => {
      const expiredToken = jwt.sign(
        { userId: validPayload.userId, email: validPayload.email, role: validPayload.role },
        TEST_SECRET,
        { algorithm: 'HS256', expiresIn: '-1s' }
      );
      expect(() => verifyToken(expiredToken)).toThrow();
    });

    it('should throw on a token signed with a different secret', () => {
      const badToken = jwt.sign(
        { userId: validPayload.userId, email: validPayload.email, role: validPayload.role },
        'wrong-secret',
        { algorithm: 'HS256', expiresIn: '24h' }
      );
      expect(() => verifyToken(badToken)).toThrow();
    });

    it('should throw on a malformed token', () => {
      expect(() => verifyToken('not.a.valid.token')).toThrow();
      expect(() => verifyToken('')).toThrow();
      expect(() => verifyToken('garbage')).toThrow();
    });
  });
});
