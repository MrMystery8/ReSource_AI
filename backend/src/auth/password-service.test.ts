import { hashPassword, verifyPassword } from './password-service';

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await hashPassword('mypassword');
      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$10\$/);
    });

    it('should produce different hashes for the same input (unique salts)', async () => {
      const hash1 = await hashPassword('samepassword');
      const hash2 = await hashPassword('samepassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a matching password', async () => {
      const hash = await hashPassword('correctpassword');
      const result = await verifyPassword('correctpassword', hash);
      expect(result).toBe(true);
    });

    it('should return false for a non-matching password', async () => {
      const hash = await hashPassword('correctpassword');
      const result = await verifyPassword('wrongpassword', hash);
      expect(result).toBe(false);
    });
  });
});
