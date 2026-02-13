import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectSuspiciousActivity,
  isSuspiciousActivityType,
  Context,
} from '../suspicious-detector';

// Track UUID calls to ensure uniqueness
let uuidCounter = 0;
const originalRandomUUID = globalThis.crypto?.randomUUID;

beforeEach(() => {
  vi.clearAllMocks();
  uuidCounter = 0;

  // Mock crypto.randomUUID to return unique values
  if (globalThis.crypto) {
    globalThis.crypto.randomUUID = vi.fn().mockImplementation(() => {
      uuidCounter++;
      return `test-uuid-${uuidCounter.toString().padStart(4, '0')}`;
    });
  }
});

afterEach(() => {
  if (globalThis.crypto && originalRandomUUID) {
    globalThis.crypto.randomUUID = originalRandomUUID;
  } else if (globalThis.crypto) {
    delete (globalThis.crypto as { randomUUID?: () => string }).randomUUID;
  }
  vi.restoreAllMocks();
});

describe('suspicious-detector.ts - detectSuspiciousActivity', () => {
  describe('tab_hidden detection', () => {
    it('should detect tab_hidden when isHidden is true', () => {
      const context: Context = {
        userId: 'user123',
        fileId: 'file456',
        isHidden: true,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(1);
      expect(result[0].activity_type).toBe('tab_hidden');
      expect(result[0].user_id).toBe('user123');
      expect(result[0].file_id).toBe('file456');
      expect(result[0].reason).toBe('Document was hidden while learning');
    });

    it('should not detect tab_hidden when isHidden is false', () => {
      const context: Context = {
        userId: 'user123',
        isHidden: false,
      };

      const result = detectSuspiciousActivity(context);

      expect(result).not.toContainEqual(
        expect.objectContaining({ activity_type: 'tab_hidden' })
      );
    });

    it('should not detect tab_hidden when isHidden is undefined', () => {
      const context: Context = {
        userId: 'user123',
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(0);
    });
  });

  describe('video_muted detection', () => {
    it('should detect video_muted when isMuted is true', () => {
      const context: Context = {
        userId: 'user123',
        fileId: 'video789',
        isMuted: true,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(1);
      expect(result[0].activity_type).toBe('video_muted');
      expect(result[0].reason).toBe('Video was muted during playback');
    });

    it('should not detect video_muted when isMuted is false', () => {
      const context: Context = {
        userId: 'user123',
        isMuted: false,
      };

      const result = detectSuspiciousActivity(context);

      expect(result).not.toContainEqual(
        expect.objectContaining({ activity_type: 'video_muted' })
      );
    });
  });

  describe('video_fast_forward detection', () => {
    it('should detect video_fast_forward when playbackRate exceeds threshold', () => {
      const context: Context = {
        userId: 'user123',
        playbackRate: 2.0,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(1);
      expect(result[0].activity_type).toBe('video_fast_forward');
      expect(result[0].reason).toContain('exceeds threshold');
    });

    it('should not detect video_fast_forward when playbackRate is at threshold', () => {
      const context: Context = {
        userId: 'user123',
        playbackRate: 1.5,
      };

      const result = detectSuspiciousActivity(context);

      expect(result).not.toContainEqual(
        expect.objectContaining({ activity_type: 'video_fast_forward' })
      );
    });

    it('should not detect video_fast_forward when playbackRate is below threshold', () => {
      const context: Context = {
        userId: 'user123',
        playbackRate: 1.0,
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(0);
    });
  });

  describe('time_gap_anomaly detection', () => {
    it('should detect time_gap_anomaly when timeGap exceeds threshold', () => {
      const context: Context = {
        userId: 'user123',
        timeGap: 700, // 700 seconds > 600 threshold
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(1);
      expect(result[0].activity_type).toBe('time_gap_anomaly');
      expect(result[0].reason).toContain('exceeds threshold');
    });

    it('should not detect time_gap_anomaly when timeGap is at threshold', () => {
      const context: Context = {
        userId: 'user123',
        timeGap: 600, // Exactly at threshold
      };

      const result = detectSuspiciousActivity(context);

      expect(result).not.toContainEqual(
        expect.objectContaining({ activity_type: 'time_gap_anomaly' })
      );
    });

    it('should not detect time_gap_anomaly when timeGap is below threshold', () => {
      const context: Context = {
        userId: 'user123',
        timeGap: 300,
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(0);
    });
  });

  describe('Multiple detection', () => {
    it('should detect multiple suspicious activities simultaneously', () => {
      const context: Context = {
        userId: 'user123',
        fileId: 'file456',
        isHidden: true,
        isMuted: true,
        playbackRate: 2.5,
        timeGap: 800,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result).toHaveLength(4);

      const types = result.map((a) => a.activity_type);
      expect(types).toContain('tab_hidden');
      expect(types).toContain('video_muted');
      expect(types).toContain('video_fast_forward');
      expect(types).toContain('time_gap_anomaly');
    });

    it('should generate unique IDs for each detected activity', () => {
      const context: Context = {
        userId: 'user123',
        isHidden: true,
        isMuted: true,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      const ids = result.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(result.length);
    });
  });

  describe('Evidence and metadata', () => {
    it('should include timestamp in evidence', () => {
      const context: Context = {
        userId: 'user123',
        isHidden: true,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result[0].evidence.timestamp).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should merge additional evidence', () => {
      const context: Context = {
        userId: 'user123',
        isHidden: true,
        evidence: { browser: 'Chrome', pageUrl: '/learn' },
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const result = detectSuspiciousActivity(context);

      expect(result[0].evidence.browser).toBe('Chrome');
      expect(result[0].evidence.pageUrl).toBe('/learn');
    });

    it('should use current date when timestamp is not provided', () => {
      const context: Context = {
        userId: 'user123',
        isHidden: true,
      };

      const before = new Date();
      const result = detectSuspiciousActivity(context);
      const after = new Date();

      expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result[0].created_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

describe('suspicious-detector.ts - isSuspiciousActivityType', () => {
  it('should return true for tab_hidden', () => {
    expect(isSuspiciousActivityType('tab_hidden')).toBe(true);
  });

  it('should return true for video_muted', () => {
    expect(isSuspiciousActivityType('video_muted')).toBe(true);
  });

  it('should return true for video_fast_forward', () => {
    expect(isSuspiciousActivityType('video_fast_forward')).toBe(true);
  });

  it('should return true for time_gap_anomaly', () => {
    expect(isSuspiciousActivityType('time_gap_anomaly')).toBe(true);
  });

  it('should return false for unknown activity types', () => {
    expect(isSuspiciousActivityType('NORMAL_VIEW')).toBe(false);
    expect(isSuspiciousActivityType('VIDEO_PLAYED')).toBe(false);
    expect(isSuspiciousActivityType('PAGE_VISIBLE')).toBe(false);
    expect(isSuspiciousActivityType('')).toBe(false);
  });

  it('should be case sensitive', () => {
    expect(isSuspiciousActivityType('TAB_HIDDEN')).toBe(false);
    expect(isSuspiciousActivityType('video_muted')).toBe(true);
    expect(isSuspiciousActivityType('VIDEO_MUTED')).toBe(false);
  });
});
