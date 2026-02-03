import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transaction, TransactionError } from '../transaction'
import { db } from '@/db'

// Mock database
vi.mock('@/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}))

describe('Transaction Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('transaction', () => {
    it('should commit when callback succeeds', async () => {
      const mockCallbackResult = { id: 'task-1', title: 'Test Task' }
      const mockTx = vi.fn().mockImplementation(async (callback) => {
        return await callback({} as unknown)
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      const result = await transaction(async () => {
        return mockCallbackResult
      })

      expect(db.transaction).toHaveBeenCalled()
      expect(result).toEqual(mockCallbackResult)
    })

    it('should rollback when callback throws error', async () => {
      const mockError = new Error('Database error')
      const mockTx = vi.fn().mockImplementation(async () => {
        throw mockError
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      await expect(
        transaction(async () => {
          throw mockError
        })
      ).rejects.toThrow(TransactionError)
    })

    it('should wrap errors in TransactionError', async () => {
      const originalError = new Error('Constraint violation')
      const mockTx = vi.fn().mockImplementation(async () => {
        throw originalError
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      await expect(
        transaction(async () => {
          throw originalError
        })
      ).rejects.toThrow(TransactionError)

      // Verify the error is wrapped with cause
      try {
        await transaction(async () => {
          throw originalError
        })
        throw new Error('Should have thrown TransactionError')
      } catch (error) {
        expect(error).toBeInstanceOf(TransactionError)
        expect((error as TransactionError).cause).toBe(originalError)
      }
    })

    it('should propagate return value from callback', async () => {
      const expectedValue = { taskId: 'task-123', status: 'created' }
      const mockTx = vi.fn().mockImplementation(async (callback) => {
        return await callback({} as unknown)
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      const result = await transaction(async () => {
        return expectedValue
      })

      expect(result).toEqual(expectedValue)
    })

    it('should handle multiple operations in single transaction', async () => {
      const operations: string[] = []
      const mockTx = vi.fn().mockImplementation(async (callback) => {
        return await callback({} as unknown)
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      const result = await transaction(async () => {
        operations.push('first')
        operations.push('second')
        operations.push('third')
        return { success: true, count: operations.length }
      })

      expect(db.transaction).toHaveBeenCalledTimes(1)
      expect(operations).toEqual(['first', 'second', 'third'])
      expect(result).toEqual({ success: true, count: 3 })
    })

    it('should pass transaction object to callback', async () => {
      const mockTxObj = { id: 'mock-tx-123' }
      const mockTx = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockTxObj as unknown)
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      const receivedTx: unknown[] = []

      await transaction(async (tx) => {
        receivedTx.push(tx)
        return { success: true }
      })

      expect(receivedTx).toHaveLength(1)
      expect(receivedTx[0]).toBe(mockTxObj)
    })

    it('should handle non-Error exceptions', async () => {
      const nonErrorValue = 'string error'
      const mockTx = vi.fn().mockImplementation(async () => {
        throw nonErrorValue
      })

      vi.mocked(db.transaction).mockImplementation(mockTx)

      await expect(
        transaction(async () => {
          throw nonErrorValue
        })
      ).rejects.toThrow(TransactionError)
    })
  })

  describe('TransactionError', () => {
    it('should have correct properties', () => {
      const originalError = new Error('Original error')
      const txError = new TransactionError('Transaction failed', originalError)

      expect(txError.message).toBe('Transaction failed')
      expect(txError.cause).toBe(originalError)
      expect(txError.name).toBe('TransactionError')
    })

    it('should be instance of Error', () => {
      const txError = new TransactionError('Transaction failed')

      expect(txError).toBeInstanceOf(Error)
      expect(txError).toBeInstanceOf(TransactionError)
    })

    it('should work without cause', () => {
      const txError = new TransactionError('Transaction failed')

      expect(txError.message).toBe('Transaction failed')
      expect(txError.cause).toBeUndefined()
    })
  })
})
