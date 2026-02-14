import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PdfLearningValidator } from '../pdf-validator';

// Mock @/lib/db before importing
vi.mock('@/lib/db', () => {
  const mockSql = vi.fn();
  return {
    sql: mockSql,
  };
});

// Need to import after mock
import { sql as mockDb } from '@/lib/db';

describe('PdfLearningValidator', () => {
  let validator: PdfLearningValidator;

  beforeEach(() => {
    vi.resetAllMocks();
    validator = new PdfLearningValidator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validate', () => {
    it('should return valid result when all conditions are met', async () => {
      const fileId = 'file-123';
      const userId = 'user-456';

      // Mock checkFileOpened - has open log
      mockDb
        .mockResolvedValueOnce([{ count: '1' }]) // COUNT for isOpened
        .mockResolvedValueOnce([
          { timestamp: '2024-01-01T10:00:00Z' },
          { timestamp: '2024-01-01T10:10:00Z' },
        ]) // calculateDuration logs
        .mockResolvedValueOnce([{ total_pages: 10 }]) // total_pages from task_files
        .mockResolvedValueOnce([{ max_page: 10 }]); // max_page from learning_logs

      const result = await validator.validate(fileId, userId);

      expect(result.isOpened).toBe(true);
      expect(result.durationMinutes).toBe(10);
      expect(result.reachedLastPage).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when file was never opened', async () => {
      const fileId = 'file-123';
      const userId = 'user-456';

      mockDb
        .mockResolvedValueOnce([{ count: '0' }]) // No open logs
        .mockResolvedValueOnce([]) // No duration logs
        .mockResolvedValueOnce([{ total_pages: 10 }]) // File exists
        .mockResolvedValueOnce([{ max_page: 0 }]); // No page viewed

      const result = await validator.validate(fileId, userId);

      expect(result.isOpened).toBe(false);
      expect(result.durationMinutes).toBe(0);
      expect(result.reachedLastPage).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should return invalid when duration is less than 5 minutes', async () => {
      const fileId = 'file-123';
      const userId = 'user-456';

      mockDb
        .mockResolvedValueOnce([{ count: '1' }]) // File was opened
        .mockResolvedValueOnce([
          { timestamp: '2024-01-01T10:00:00Z' },
          { timestamp: '2024-01-01T10:03:00Z' },
        ]) // Only 3 minutes
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: 10 }]); // Reached last page

      const result = await validator.validate(fileId, userId);

      expect(result.isOpened).toBe(true);
      expect(result.durationMinutes).toBe(3);
      expect(result.reachedLastPage).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('should return invalid when user did not reach last page', async () => {
      const fileId = 'file-123';
      const userId = 'user-456';

      mockDb
        .mockResolvedValueOnce([{ count: '1' }]) // File was opened
        .mockResolvedValueOnce([
          { timestamp: '2024-01-01T10:00:00Z' },
          { timestamp: '2024-01-01T10:10:00Z' },
        ]) // 10 minutes duration
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: 5 }]); // Only reached page 5

      const result = await validator.validate(fileId, userId);

      expect(result.isOpened).toBe(true);
      expect(result.durationMinutes).toBe(10);
      expect(result.reachedLastPage).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should return invalid when no learning logs exist', async () => {
      const fileId = 'file-123';
      const userId = 'user-456';

      mockDb
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([]) // No logs
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: 0 }]);

      const result = await validator.validate(fileId, userId);

      expect(result.isOpened).toBe(false);
      expect(result.durationMinutes).toBe(0);
      expect(result.reachedLastPage).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should throw error when database query fails', async () => {
      const fileId = 'file-123';
      const userId = 'user-456';

      mockDb.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(validator.validate(fileId, userId)).rejects.toThrow('PDF validation failed');
    });
  });

  describe('checkFileOpened', () => {
    it('should return true when at least one open log exists', async () => {
      mockDb.mockResolvedValueOnce([{ count: '5' }]);

      const result = await (validator as unknown as { checkFileOpened: (fileId: string, userId: string) => Promise<boolean> }).checkFileOpened('file-123', 'user-456');

      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledTimes(1);
    });

    it('should return false when no open logs exist', async () => {
      mockDb.mockResolvedValueOnce([{ count: '0' }]);

      const result = await (validator as unknown as { checkFileOpened: (fileId: string, userId: string) => Promise<boolean> }).checkFileOpened('file-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should handle empty result gracefully', async () => {
      mockDb.mockResolvedValueOnce([]);

      const result = await (validator as unknown as { checkFileOpened: (fileId: string, userId: string) => Promise<boolean> }).checkFileOpened('file-123', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration from first to last log entry in minutes', async () => {
      mockDb.mockResolvedValueOnce([
        { timestamp: '2024-01-01T10:00:00Z' },
        { timestamp: '2024-01-01T10:30:00Z' },
        { timestamp: '2024-01-01T11:00:00Z' },
      ]);

      const result = await (validator as unknown as { calculateDuration: (fileId: string, userId: string) => Promise<number> }).calculateDuration('file-123', 'user-456');

      expect(result).toBe(60); // 60 minutes
    });

    it('should return 0 when no logs exist', async () => {
      mockDb.mockResolvedValueOnce([]);

      const result = await (validator as unknown as { calculateDuration: (fileId: string, userId: string) => Promise<number> }).calculateDuration('file-123', 'user-456');

      expect(result).toBe(0);
    });

    it('should return 0 when only one log exists', async () => {
      mockDb.mockResolvedValueOnce([{ timestamp: '2024-01-01T10:00:00Z' }]);

      const result = await (validator as unknown as { calculateDuration: (fileId: string, userId: string) => Promise<number> }).calculateDuration('file-123', 'user-456');

      expect(result).toBe(0);
    });

    it('should handle Date objects as timestamps', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes later

      mockDb.mockResolvedValueOnce([{ timestamp: now }, { timestamp: later }]);

      const result = await (validator as unknown as { calculateDuration: (fileId: string, userId: string) => Promise<number> }).calculateDuration('file-123', 'user-456');

      expect(result).toBe(10);
    });
  });

  describe('checkReachedLastPage', () => {
    it('should return true when max page >= total pages', async () => {
      mockDb
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: 10 }]);

      const result = await (validator as unknown as { checkReachedLastPage: (fileId: string, userId: string) => Promise<boolean> }).checkReachedLastPage('file-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return true when max page exceeds total pages', async () => {
      mockDb
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: 15 }]);

      const result = await (validator as unknown as { checkReachedLastPage: (fileId: string, userId: string) => Promise<boolean> }).checkReachedLastPage('file-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return false when max page < total pages', async () => {
      mockDb
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: 5 }]);

      const result = await (validator as unknown as { checkReachedLastPage: (fileId: string, userId: string) => Promise<boolean> }).checkReachedLastPage('file-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should return true when file info not found but page logs exist', async () => {
      mockDb
        .mockResolvedValueOnce([{ total_pages: null }]) // No file info
        .mockResolvedValueOnce([{ page_num: 5 }]); // Recent page log exists

      const result = await (validator as unknown as { checkReachedLastPage: (fileId: string, userId: string) => Promise<boolean> }).checkReachedLastPage('file-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return false when file not found and no page logs', async () => {
      mockDb
        .mockResolvedValueOnce([{ total_pages: null }])
        .mockResolvedValueOnce([]); // No page logs

      const result = await (validator as unknown as { checkReachedLastPage: (fileId: string, userId: string) => Promise<boolean> }).checkReachedLastPage('file-123', 'user-456');

      expect(result).toBe(false);
    });

    it('should handle null max_page from database', async () => {
      mockDb
        .mockResolvedValueOnce([{ total_pages: 10 }])
        .mockResolvedValueOnce([{ max_page: null }]);

      const result = await (validator as unknown as { checkReachedLastPage: (fileId: string, userId: string) => Promise<boolean> }).checkReachedLastPage('file-123', 'user-456');

      expect(result).toBe(false);
    });
  });
});
