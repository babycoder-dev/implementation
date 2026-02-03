import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateSession } from '../session'
import { validateRequest } from '../middleware'

vi.mock('../session')

describe('validateRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate a request with valid session', async () => {
    const mockUserId = 'user-123'
    vi.mocked(validateSession).mockResolvedValue({
      userId: mockUserId,
      createdAt: Date.now(),
    })

    const request = new Request('http://localhost:3000', {
      headers: new Headers({
        cookie: 'session-token=valid-token',
      }),
    })

    const result = await validateRequest(request)

    expect(result).toBeDefined()
    expect(result?.userId).toBe(mockUserId)
  })

  it('should return null for invalid session', async () => {
    vi.mocked(validateSession).mockResolvedValue(null)

    const request = new Request('http://localhost:3000')

    const result = await validateRequest(request)

    expect(result).toBeNull()
  })
})
