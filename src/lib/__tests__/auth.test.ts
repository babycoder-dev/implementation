import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  hashPassword,
  verifyPassword,
  getUserFromHeaders,
} from '@/lib/auth';

describe('Auth Module', () => {
  describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(50); // bcrypt hash is typically 60 chars
      expect(hash).not.toBe(password);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt includes random salt
    });

    it('should verify correct password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');

      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(true);
    });

    it('should handle long password', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);

      const isValid = await verifyPassword(longPassword, hash);
      expect(isValid).toBe(true);
    });

    it('should generate unique hashes for same password (salting)', async () => {
      const password = 'testPassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Hashes should be different due to random salt
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('should reject wrong password even with correct hash', async () => {
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(correctPassword);

      // Wrong password should fail
      expect(await verifyPassword(wrongPassword, hash)).toBe(false);
      // Correct password should pass
      expect(await verifyPassword(correctPassword, hash)).toBe(true);
    });

    it('should handle concurrent password hashing', async () => {
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];
      const hashes = await Promise.all(passwords.map(p => hashPassword(p)));

      expect(hashes).toHaveLength(5);
      hashes.forEach((hash, i) => {
        expect(hash).not.toBe(passwords[i]);
      });
    });
  });

  describe('getUserFromHeaders', () => {
    it('should return user info when all headers are present', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-user-id': 'user-123',
          'x-user-name': 'testuser',
          'x-user-role': 'user',
        },
      });

      const user = getUserFromHeaders(request);

      expect(user).toEqual({
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      });
    });

    it('should return null when x-user-id is missing', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-user-name': 'testuser',
          'x-user-role': 'user',
        },
      });

      const user = getUserFromHeaders(request);

      expect(user).toBeNull();
    });

    it('should return null when x-user-name is missing', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-user-id': 'user-123',
          'x-user-role': 'user',
        },
      });

      const user = getUserFromHeaders(request);

      expect(user).toBeNull();
    });

    it('should return null when x-user-role is missing', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-user-id': 'user-123',
          'x-user-name': 'testuser',
        },
      });

      const user = getUserFromHeaders(request);

      expect(user).toBeNull();
    });

    it('should return null when no headers are present', () => {
      const request = new NextRequest('http://localhost');

      const user = getUserFromHeaders(request);

      expect(user).toBeNull();
    });

    it('should return leader role correctly', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-user-id': 'leader-123',
          'x-user-name': 'leaderuser',
          'x-user-role': 'leader',
        },
      });

      const user = getUserFromHeaders(request);

      expect(user).toEqual({
        userId: 'leader-123',
        username: 'leaderuser',
        role: 'leader',
      });
    });

    it('should return admin role correctly', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-user-id': 'admin-123',
          'x-user-name': 'adminuser',
          'x-user-role': 'admin',
        },
      });

      const user = getUserFromHeaders(request);

      expect(user).toEqual({
        userId: 'admin-123',
        username: 'adminuser',
        role: 'admin',
      });
    });
  });
});
