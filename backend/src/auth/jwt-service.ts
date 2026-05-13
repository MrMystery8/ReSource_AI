import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '@resource-ai/shared';

const TOKEN_EXPIRY = '24h';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export interface TokenInput {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Generates a signed JWT token with HS256 algorithm and 24-hour expiry.
 */
export function generateToken(payload: TokenInput): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    getSecret(),
    { algorithm: 'HS256', expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verifies a JWT token's signature and expiry.
 * Returns the decoded payload on success, throws on invalid/expired tokens.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
  return decoded as JwtPayload;
}
