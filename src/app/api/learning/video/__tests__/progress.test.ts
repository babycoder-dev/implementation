import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../progress/route'
import { db } from '@/db'
import { videoProgress } from '@/db/schema'

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

describe('POST /api/learning/video/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update video progress', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 120,
        duration: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      currentTime: 120,
      duration: 300,
    })
  })

  it('should handle progress at beginning of video', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 0,
        duration: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      currentTime: 0,
      duration: 300,
    })
  })

  it('should handle completed video progress', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 300,
        duration: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      currentTime: 300,
      duration: 300,
    })
  })

  it('should handle short video with minimal duration', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 5,
        duration: 10,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'test-user-id',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      currentTime: 5,
      duration: 10,
    })
  })

  it('should return 401 for unauthorized request', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 120,
        duration: 300,
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

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: 'not-a-uuid',
        currentTime: 120,
        duration: 300,
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

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: -1,
        duration: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for negative duration', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 120,
        duration: -1,
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

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        currentTime: 120,
        duration: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for missing currentTime', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        duration: 300,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return 400 for missing duration', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'test-user-id' })

    const request = new Request('http://localhost:3000/api/learning/video/progress', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        currentTime: 120,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
