// Login rate limiter - SRS-04 requirement
// Lock account after 5 failed attempts for 30 minutes

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RESET_DURATION_MS = 30 * 60 * 1000; // Reset after 30 minutes of no attempts

// In-memory store (in production, use Redis or database)
const loginAttempts = new Map<string, LoginAttempt>();

/**
 * Check if account is locked due to too many failed login attempts
 * Returns true if locked, false if can attempt login
 */
export function isAccountLocked(username: string): boolean {
  const attempt = loginAttempts.get(username.toLowerCase());
  if (!attempt) return false;
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    return true;
  }
  // Lock expired, reset
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    loginAttempts.delete(username.toLowerCase());
    return false;
  }
  return false;
}

/**
 * Record a failed login attempt
 * Returns true if account is now locked
 */
export function recordFailedAttempt(username: string): boolean {
  const key = username.toLowerCase();
  const now = Date.now();
  let attempt = loginAttempts.get(key);

  if (!attempt) {
    // First failed attempt
    attempt = {
      count: 1,
      firstAttempt: now,
      lockedUntil: null,
    };
  } else {
    // Check if lock expired
    if (attempt.lockedUntil && now >= attempt.lockedUntil) {
      attempt = {
        count: 1,
        firstAttempt: now,
        lockedUntil: null,
      };
    } else {
      // Increment count
      attempt.count += 1;
      // Check if should lock
      if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
        attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
      }
    }
  }

  loginAttempts.set(key, attempt);

  // Clean up old entries periodically
  if (loginAttempts.size > 10000) {
    cleanupOldEntries();
  }

  return attempt.lockedUntil !== null;
}

/**
 * Reset failed login attempts on successful login
 */
export function resetFailedAttempts(username: string): void {
  loginAttempts.delete(username.toLowerCase());
}

/**
 * Get remaining lock time in seconds, or 0 if not locked
 */
export function getRemainingLockTime(username: string): number {
  const attempt = loginAttempts.get(username.toLowerCase());
  if (!attempt?.lockedUntil) return 0;
  const remaining = attempt.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clean up old entries to prevent memory leaks
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts.entries()) {
    // Remove if expired and no lock
    if (!attempt.lockedUntil && now - attempt.firstAttempt > RESET_DURATION_MS) {
      loginAttempts.delete(key);
    }
    // Remove if lock expired
    if (attempt.lockedUntil && now > attempt.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}
