import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, clearAllRateLimits } from '../rate-limit'

describe('rateLimit', () => {
  const identifier = 'test-ip-127.0.0.1'

  beforeEach(() => {
    // Clear all rate limit data before each test
    clearAllRateLimits()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic rate limiting', () => {
    it('should allow requests within the limit', () => {
      const limit = 5
      const windowMs = 60 * 1000

      for (let i = 0; i < limit; i++) {
        const result = rateLimit(identifier, limit, windowMs)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(limit - 1 - i)
      }
    })

    it('should deny requests exceeding the limit', () => {
      const limit = 3
      const windowMs = 60 * 1000

      // Allow first 3 requests
      for (let i = 0; i < limit; i++) {
        const result = rateLimit(identifier, limit, windowMs)
        expect(result.allowed).toBe(true)
      }

      // 4th request should be denied
      const result = rateLimit(identifier, limit, windowMs)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.resetAt).toBeDefined()
    })

    it('should reset after the window expires', () => {
      const limit = 3
      const windowMs = 60 * 1000

      // Use all limit
      for (let i = 0; i < limit; i++) {
        rateLimit(identifier, limit, windowMs)
      }

      // Next request should be denied
      let result = rateLimit(identifier, limit, windowMs)
      expect(result.allowed).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(windowMs + 1)

      // Now request should be allowed again
      result = rateLimit(identifier, limit, windowMs)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(limit - 1)
    })
  })

  describe('Multiple identifiers', () => {
    it('should track limits independently for different identifiers', () => {
      const limit = 3
      const windowMs = 60 * 1000

      const id1 = 'ip-192.168.1.1'
      const id2 = 'ip-192.168.1.2'

      // Use all limit for id1
      for (let i = 0; i < limit; i++) {
        const result = rateLimit(id1, limit, windowMs)
        expect(result.allowed).toBe(true)
      }

      // id2 should still have full limit available
      const result = rateLimit(id2, limit, windowMs)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(limit - 1)

      // id1 should be denied
      const result1 = rateLimit(id1, limit, windowMs)
      expect(result1.allowed).toBe(false)
    })
  })

  describe('Different configurations', () => {
    it('should support different limits for same identifier', () => {
      const id = 'user-123'

      // First config: 2 requests per minute
      for (let i = 0; i < 2; i++) {
        const result = rateLimit(id, 2, 60 * 1000)
        expect(result.allowed).toBe(true)
      }

      const result = rateLimit(id, 2, 60 * 1000)
      expect(result.allowed).toBe(false)

      // Different config: 5 requests per hour should still work
      // (different limit parameters, so separate tracking)
      for (let i = 0; i < 5; i++) {
        const result = rateLimit(id, 5, 60 * 60 * 1000)
        expect(result.allowed).toBe(true)
      }
    })

    it('should support short windows', () => {
      const limit = 10
      const windowMs = 100 // 100ms

      for (let i = 0; i < limit; i++) {
        const result = rateLimit(identifier, limit, windowMs)
        expect(result.allowed).toBe(true)
      }

      // Should be denied
      const result = rateLimit(identifier, limit, windowMs)
      expect(result.allowed).toBe(false)

      // Advance past window
      vi.advanceTimersByTime(windowMs + 1)

      // Should be allowed again
      const afterReset = rateLimit(identifier, limit, windowMs)
      expect(afterReset.allowed).toBe(true)
    })
  })

  describe('Return value', () => {
    it('should return proper result structure', () => {
      const limit = 5
      const windowMs = 60 * 1000

      const result = rateLimit(identifier, limit, windowMs)

      expect(result).toHaveProperty('allowed', true)
      expect(result).toHaveProperty('remaining', limit - 1)
      expect(result).toHaveProperty('limit', limit)
      expect(result).toHaveProperty('resetAt')
      expect(typeof result.resetAt).toBe('number')
      expect(result.resetAt).toBeGreaterThan(Date.now())
    })

    it('should include correct reset time when denied', () => {
      const limit = 1
      const windowMs = 60 * 1000

      // First request allowed
      const firstResult = rateLimit(identifier, limit, windowMs)
      expect(firstResult.allowed).toBe(true)

      // Second request denied
      const deniedResult = rateLimit(identifier, limit, windowMs)
      expect(deniedResult.allowed).toBe(false)

      // Reset time should be approximately windowMs from the first request
      expect(deniedResult.resetAt).toBeGreaterThan(0)
      expect(deniedResult.resetAt).toBeLessThanOrEqual(firstResult.resetAt + 100)
    })
  })

  describe('Edge cases', () => {
    it('should handle limit of 1', () => {
      const limit = 1
      const windowMs = 60 * 1000

      const result1 = rateLimit(identifier, limit, windowMs)
      expect(result1.allowed).toBe(true)

      const result2 = rateLimit(identifier, limit, windowMs)
      expect(result2.allowed).toBe(false)
    })

    it('should handle large limits', () => {
      const limit = 1000
      const windowMs = 60 * 1000

      const result = rateLimit(identifier, limit, windowMs)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(limit - 1)
    })

    it('should handle zero remaining correctly', () => {
      const limit = 1
      const windowMs = 60 * 1000

      rateLimit(identifier, limit, windowMs)
      const result = rateLimit(identifier, limit, windowMs)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('Sliding window behavior', () => {
    it('should implement sliding window correctly', () => {
      const limit = 3
      const windowMs = 100 // 100ms window

      // Make 3 requests
      for (let i = 0; i < limit; i++) {
        rateLimit(identifier, limit, windowMs)
      }

      // Advance time but stay within window
      vi.advanceTimersByTime(50)

      // Still denied because window hasn't reset
      const result1 = rateLimit(identifier, limit, windowMs)
      expect(result1.allowed).toBe(false)

      // Advance past window
      vi.advanceTimersByTime(60)

      // Should be allowed again
      const result2 = rateLimit(identifier, limit, windowMs)
      expect(result2.allowed).toBe(true)
    })
  })
})
