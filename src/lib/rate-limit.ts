/**
 * Rate limiting utility for API routes.
 *
 * Uses a sliding window algorithm with in-memory storage.
 * For production, consider using Redis for distributed rate limiting.
 */

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
 */
function getStoreKey(identifier: string, limit: number, windowMs: number): string {
  return `${identifier}|${limit}|${windowMs}`
}

/**
 * Cleans up expired entries from the rate limit store.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  const keysToDelete: string[] = []

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart + windowMsFromKey(key) < now) {
      keysToDelete.push(key)
    }
  }

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
  const now = Date.now()
  const key = getStoreKey(identifier, limit, windowMs)
  const existing = rateLimitStore.get(key)

  // Periodic cleanup of expired entries (every 1000 calls to avoid performance impact)
  if (rateLimitStore.size > 0 && Math.random() < 0.001) {
    cleanupExpiredEntries()
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
