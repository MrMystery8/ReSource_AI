import bcrypt from 'bcryptjs';

const COST_FACTOR = 10;

/**
 * Hashes a plaintext password using bcrypt with cost factor 10.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(COST_FACTOR);
  return bcrypt.hash(plain, salt);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
