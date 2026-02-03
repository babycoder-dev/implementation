import { db } from './index'

/**
 * Transaction error wrapper for better error handling
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export class TransactionError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'TransactionError'
    this.cause = cause

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TransactionError)
    }
  }
}

/**
 * Transaction callback function type
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export type TransactionCallback<T> = (tx: any) => Promise<T>

/**
 * Wrapper function for database transactions
 *
 * Provides automatic rollback on error and consistent error handling.
 * All database operations performed within the callback will be atomic -
 * they either all succeed or all fail together.
 *
 * @param callback - Async function containing database operations
 * @returns Promise resolving to the callback's return value on success
 * @throws TransactionError if transaction fails or callback throws
 *
 * @example
 * ```ts
 * const result = await transaction(async (tx) => {
 *   const [task] = await tx.insert(tasks).values({ title: 'Test' }).returning()
 *   await tx.insert(taskFiles).values({ taskId: task.id, title: 'File' })
 *   return task
 * })
 * ```
 */
export async function transaction<T>(callback: TransactionCallback<T>): Promise<T> {
  try {
    return await db.transaction(callback)
  } catch (error) {
    if (error instanceof Error) {
      throw new TransactionError('Transaction failed', error)
    }
    throw new TransactionError('Transaction failed', new Error(String(error)))
  }
}
