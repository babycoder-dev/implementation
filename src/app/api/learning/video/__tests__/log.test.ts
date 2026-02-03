import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../log/route'
import { db } from '@/db'
import { videoLogs } from '@/db/schema'

// Mock database
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
}))

// Mock session validation
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('POST /api/learning/video/log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should log a video play action', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'play',
        currentTime: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'play',
      currentTime: 0,
    })
  })

  it('should log a video pause action', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'pause',
        currentTime: 45,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'pause',
      currentTime: 45,
    })
  })

  it('should log a video seek action', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'seek',
        currentTime: 120,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'seek',
      currentTime: 120,
    })
  })

  it('should log a video finish action', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'finish',
        currentTime: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'finish',
      currentTime: 300,
    })
  })

  it('should return 401 for unauthorized request', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'play',
        currentTime: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('should return 400 for invalid UUID', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: 'not-a-uuid',
        action: 'play',
        currentTime: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for invalid action type', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'invalid-action',
        currentTime: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for negative current time', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'play',
        currentTime: -1,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for missing fileId', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        action: 'play',
        currentTime: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for missing action', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/log', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
