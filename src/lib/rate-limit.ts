// Login rate limiter - SRS-04 requirement
// Lock account after 5 failed attempts for 30 minutes
// Uses PostgreSQL for storage (works in production with multiple instances)

import { sql } from './db';

const LOGIN_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RESET_DURATION_MS = 30 * 60 * 1000; // Reset after 30 minutes of no attempts

let tableInitialized = false;

/**
 * Ensure table exists before any operation
 */
async function ensureTableInitialized(): Promise<void> {
  if (tableInitialized) return;
  try {
    await initLoginAttemptsTable();
    tableInitialized = true;
  } catch (error) {
    console.error('Failed to initialize login_attempts table:', error);
  }
}

/**
 * Initialize login_attempts table if not exists
 */
export async function initLoginAttemptsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      username VARCHAR(255) PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      first_attempt BIGINT NOT NULL,
      locked_until BIGINT
    )
  `;
}

/**
 * Check if account is locked due to too many failed login attempts
 * Returns true if locked, false if can attempt login
 */
export async function isAccountLocked(username: string): Promise<boolean> {
  await ensureTableInitialized();
  const key = username.toLowerCase();

  const result = await sql`
    SELECT locked_until FROM login_attempts
    WHERE username = ${key}
  ` as { locked_until: number | null }[];

  if (result.length === 0) return false;

  const { locked_until } = result[0];
  if (!locked_until) return false;

  const now = Date.now();
  if (now < locked_until) {
    return true;
  }

  // Lock expired, delete the record
  await sql`
    DELETE FROM login_attempts WHERE username = ${key}
  `;

  return false;
}

/**
 * Record a failed login attempt
 * Returns true if account is now locked
 */
export async function recordFailedAttempt(username: string): Promise<boolean> {
  await ensureTableInitialized();
  const key = username.toLowerCase();
  const now = Date.now();

  // Try to get existing record
  const existing = await sql`
    SELECT count, locked_until FROM login_attempts
    WHERE username = ${key}
  ` as { count: number; locked_until: number | null }[];

  if (existing.length === 0) {
    // First failed attempt
    await sql`
      INSERT INTO login_attempts (username, count, first_attempt, locked_until)
      VALUES (${key}, 1, ${now}, NULL)
    `;
    return false;
  }

  const { count, locked_until } = existing[0];

  // Check if currently locked
  if (locked_until && now >= locked_until) {
    // Lock expired, reset
    await sql`
      UPDATE login_attempts
      SET count = 1, first_attempt = ${now}, locked_until = NULL
      WHERE username = ${key}
    `;
    return false;
  }

  // Check if first attempt expired (no recent activity)
  const firstAttempt = await sql`
    SELECT first_attempt FROM login_attempts WHERE username = ${key}
  ` as { first_attempt: number }[];

  if (firstAttempt.length > 0 && (now - firstAttempt[0].first_attempt) > RESET_DURATION_MS) {
    // Reset count if no attempts for 30 minutes
    await sql`
      UPDATE login_attempts
      SET count = 1, first_attempt = ${now}, locked_until = NULL
      WHERE username = ${key}
    `;
    return false;
  }

  // Increment count
  const newCount = count + 1;
  const shouldLock = newCount >= LOGIN_MAX_ATTEMPTS;
  const lockedUntil = shouldLock ? now + LOCKOUT_DURATION_MS : null;

  await sql`
    UPDATE login_attempts
    SET count = ${newCount}, locked_until = ${lockedUntil}
    WHERE username = ${key}
  `;

  return shouldLock;
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedAttempts(username: string): Promise<void> {
  await ensureTableInitialized();
  const key = username.toLowerCase();
  await sql`
    DELETE FROM login_attempts WHERE username = ${key}
  `;
}

/**
 * Get remaining lock time in seconds, or 0 if not locked
 */
export async function getRemainingLockTime(username: string): Promise<number> {
  await ensureTableInitialized();
  const key = username.toLowerCase();

  const result = await sql`
    SELECT locked_until FROM login_attempts
    WHERE username = ${key} AND locked_until IS NOT NULL
  ` as { locked_until: number }[];

  if (result.length === 0) return 0;

  const remaining = result[0].locked_until - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clean up expired entries (call periodically)
 */
export async function cleanupOldEntries(): Promise<void> {
  const now = Date.now();

  // Delete entries where lock has expired
  await sql`
    DELETE FROM login_attempts
    WHERE locked_until IS NOT NULL AND locked_until < ${now}
  `;

  // Delete old entries with no recent activity
  const cutoff = now - RESET_DURATION_MS;
  await sql`
    DELETE FROM login_attempts
    WHERE locked_until IS NULL AND first_attempt < ${cutoff}
  `;
}
