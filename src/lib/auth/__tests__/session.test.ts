import { createSession, validateSession, destroySession } from '../session'

const mockUserId = 'user-123'

describe('Session', () => {
  describe('createSession', () => {
    it('should create a session and return token', async () => {
      const token = await createSession(mockUserId)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })
  })

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const token = await createSession(mockUserId)
      const result = await validateSession(token)
      expect(result).toBeDefined()
      expect(result?.userId).toBe(mockUserId)
    })

    it('should return null for invalid session', async () => {
      const result = await validateSession('invalid-token')
      expect(result).toBeNull()
    })
  })

  describe('destroySession', () => {
    it('should destroy a session', async () => {
      const token = await createSession(mockUserId)
      const destroyed = destroySession(token)
      expect(destroyed).toBe(true)
    })
  })
})
