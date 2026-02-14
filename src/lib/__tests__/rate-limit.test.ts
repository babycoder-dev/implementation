/**
 * Rate Limit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}));

import { sql } from '@/lib/db';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts, getRemainingLockTime, initLoginAttemptsTable } from '../rate-limit';

const mockSql = sql as ReturnType<typeof vi.fn>;

describe('Rate Limit Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initLoginAttemptsTable', () => {
    it('should execute create table query', async () => {
      mockSql.mockResolvedValue([]);
      await initLoginAttemptsTable();
      expect(mockSql).toHaveBeenCalled();
    });
  });

  describe('isAccountLocked', () => {
    it('should return false if no record exists', async () => {
      mockSql.mockResolvedValue([]);
      const result = await isAccountLocked('testuser');
      expect(result).toBe(false);
    });

    it('should return false if locked_until is null', async () => {
      mockSql.mockResolvedValue([{ locked_until: null }]);
      const result = await isAccountLocked('testuser');
      expect(result).toBe(false);
    });

    it('should return true if locked_until is in the future', async () => {
      const futureTime = Date.now() + 60000; // 1 minute from now
      mockSql.mockResolvedValue([{ locked_until: futureTime }]);
      const result = await isAccountLocked('testuser');
      expect(result).toBe(true);
    });

    it('should return false if lock has expired', async () => {
      const pastTime = Date.now() - 60000; // 1 minute ago
      mockSql.mockResolvedValue([{ locked_until: pastTime }]);
      const result = await isAccountLocked('testuser');
      expect(result).toBe(false);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should return false on first attempt', async () => {
      mockSql.mockResolvedValue([]);
      const result = await recordFailedAttempt('testuser');
      expect(result).toBe(false);
    });

    it('should return true when max attempts reached', async () => {
      // First call returns existing record, second call returns updated
      mockSql
        .mockResolvedValueOnce([{ count: 4, locked_until: null }])
        .mockResolvedValueOnce([]);
      const result = await recordFailedAttempt('testuser');
      expect(result).toBe(true);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should delete login attempts record', async () => {
      mockSql.mockResolvedValue([]);
      await resetFailedAttempts('testuser');
      expect(mockSql).toHaveBeenCalled();
    });
  });

  describe('getRemainingLockTime', () => {
    it('should return 0 if no record exists', async () => {
      mockSql.mockResolvedValue([]);
      const result = await getRemainingLockTime('testuser');
      expect(result).toBe(0);
    });

    it('should return 0 if locked_until is null', async () => {
      mockSql.mockResolvedValue([{ locked_until: null }]);
      const result = await getRemainingLockTime('testuser');
      expect(result).toBe(0);
    });

    it('should return remaining seconds if locked', async () => {
      const futureTime = Date.now() + 60000; // 1 minute from now
      mockSql.mockResolvedValue([{ locked_until: futureTime }]);
      const result = await getRemainingLockTime('testuser');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(60);
    });
  });
});
