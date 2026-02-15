/**
 * Rate limiting utility for API routes.
 *
 * Uses a fixed window algorithm with in-memory storage.
 * For production, consider using Redis for distributed rate limiting.
 */

// Maximum store size to prevent memory exhaustion DoS
const MAX_STORE_SIZE = 10000

// FIX: Add mutex to prevent race condition in rate limit checks
// Using a simple Set for tracking keys currently being processed
const processingKeys = new Set<string>()

interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number
}

// In-memory store for rate limit data
// Key format: "identifier|limit|windowMs" to allow different configs per identifier
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Creates a unique key for the rate limit entry.
 * FIX: Encode identifier to prevent key collision with pipe delimiter
 */
function getStoreKey(identifier: string, limit: number, windowMs: number): string {
  // Escape pipe characters in identifier to prevent key collision
  const safeIdentifier = identifier.replace(/\|/g, '%7C')
  return `${safeIdentifier}|${limit}|${windowMs}`
}

/**
 * Cleans up expired entries from the rate limit store.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  const keysToDelete: string[] = []

  rateLimitStore.forEach((entry, key) => {
    if (entry.windowStart + windowMsFromKey(key) < now) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach((key) => rateLimitStore.delete(key))
}

/**
 * Extracts windowMs from a store key.
 */
function windowMsFromKey(key: string): number {
  const parts = key.split('|')
  return parseInt(parts[2], 10)
}

/**
 * Checks if a request should be rate limited.
 *
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with allowed status and metadata
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  // FIX: Add input validation
  if (!identifier || typeof identifier !== 'string') {
    return { allowed: false, remaining: 0, limit: 0, resetAt: Date.now() }
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    return { allowed: false, remaining: 0, limit: 0, resetAt: Date.now() }
  }
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    return { allowed: false, remaining: 0, limit: 0, resetAt: Date.now() }
  }

  const now = Date.now()
  const key = getStoreKey(identifier, limit, windowMs)

  // FIX: Check if this key is currently being processed (race condition protection)
  if (processingKeys.has(key)) {
    // Key is being processed, return conservative result
    const existing = rateLimitStore.get(key)
    if (existing) {
      const windowEnd = existing.windowStart + windowMs
      return {
        allowed: existing.count < limit,
        remaining: Math.max(0, limit - existing.count),
        limit,
        resetAt: windowEnd,
      }
    }
  }

  // Mark key as processing
  processingKeys.add(key)

  try {
    const existing = rateLimitStore.get(key)

    // FIX: Use size-based cleanup threshold instead of random cleanup
    // This ensures cleanup happens deterministically
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      cleanupExpiredEntries()
      // If still at capacity after cleanup, reject to prevent memory exhaustion
      if (rateLimitStore.size >= MAX_STORE_SIZE) {
        return { allowed: false, remaining: 0, limit, resetAt: now + windowMs }
      }
    }

    if (!existing) {
      // First request from this identifier with this config
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now,
      })

      return {
        allowed: true,
        remaining: limit - 1,
        limit,
        resetAt: now + windowMs,
      }
    }

    // Check if window has expired
    const windowEnd = existing.windowStart + windowMs
    if (now >= windowEnd) {
      // Window expired, start fresh
      const newEntry = {
        count: 1,
        windowStart: now,
      }
      rateLimitStore.set(key, newEntry)

      return {
        allowed: true,
        remaining: limit - 1,
        limit,
        resetAt: now + windowMs,
      }
    }

    // Within the window, check if limit exceeded
    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt: windowEnd,
      }
    }

    // Increment count
    const newEntry = {
      count: existing.count + 1,
      windowStart: existing.windowStart,
    }
    rateLimitStore.set(key, newEntry)

    return {
      allowed: true,
      remaining: limit - newEntry.count,
      limit,
      resetAt: windowEnd,
    }
  } finally {
    // Always remove key from processing set
    processingKeys.delete(key)
  }
}

/**
 * Resets the rate limit for a specific identifier.
 * Useful for testing or manual reset scenarios.
 */
export function resetRateLimit(identifier: string, limit: number, windowMs: number): void {
  const key = getStoreKey(identifier, limit, windowMs)
  rateLimitStore.delete(key)
}

/**
 * Clears all rate limit entries.
 * Useful for testing to ensure test isolation.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear()
}

/**
 * Gets the current rate limit status without incrementing the counter.
 */
export function getRateLimitStatus(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult | null {
  const key = getStoreKey(identifier, limit, windowMs)
  const existing = rateLimitStore.get(key)

  if (!existing) {
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetAt: Date.now() + windowMs,
    }
  }

  const now = Date.now()
  const windowEnd = existing.windowStart + windowMs

  if (now >= windowEnd) {
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetAt: now + windowMs,
    }
  }

  return {
    allowed: existing.count < limit,
    remaining: Math.max(0, limit - existing.count),
    limit,
    resetAt: windowEnd,
  }
}
