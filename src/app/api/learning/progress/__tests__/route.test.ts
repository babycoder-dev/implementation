import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { db } from '@/db'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
  },
}))

// Mock session validation
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('GET /api/learning/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return own progress for authenticated user', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    })

    // Setup mock chain for all db.select calls
    // The drizzle query builder is: db.select().from().where() which returns a Thenable
    const createQueryBuilder = (returnValue: any) => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(returnValue),
        then: (onFulfilled: any) => Promise.resolve(returnValue).then(onFulfilled),
      }
      return chain
    }

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      switch (callCount) {
        case 1: // totalTasks
          return createQueryBuilder([{ count: 5 }]) as any
        case 2: // totalQuestions
          return createQueryBuilder([{ count: 10 }]) as any
        case 3: // answeredCount
          return createQueryBuilder([{ count: 8 }]) as any
        case 4: // correctCount
          return createQueryBuilder([{ count: 6 }]) as any
        case 5: // totalVideos
          return createQueryBuilder([{ count: 4 }]) as any
        case 6: // watchedCount
          return createQueryBuilder([{ count: 3 }]) as any
        case 7: // watchTime
          return createQueryBuilder([{ totalTime: 3600 }]) as any
        default:
          return createQueryBuilder([{ count: 0 }]) as any
      }
    })

    // Mock execute for completed tasks query
    vi.mocked(db.execute).mockResolvedValue([{ completed_count: 2 }] as any)

    const request = new Request(
      'http://localhost:3000/api/learning/progress',
      {
        method: 'GET',
        headers: { cookie: 'session-token=valid-user-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      totalTasks: 5,
      completedTasks: 2,
      quizStats: {
        totalQuestions: 10,
        answeredCount: 8,
        correctCount: 6,
      },
      videoStats: {
        totalVideos: 4,
        watchedCount: 3,
        totalWatchTime: 3600,
      },
    })
  })

  it('should allow admin to get any user progress', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-user-id',
    })

    const createQueryBuilder = (returnValue: any) => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(returnValue),
        then: (onFulfilled: any) => Promise.resolve(returnValue).then(onFulfilled),
      }
      return chain
    }

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      switch (callCount) {
        case 1: // Check admin role
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 'admin-user-id', role: 'admin', name: 'Admin' },
                ]),
              }),
            }),
          } as any
        case 2: // totalTasks
          return createQueryBuilder([{ count: 3 }]) as any
        case 3: // totalQuestions
          return createQueryBuilder([{ count: 5 }]) as any
        case 4: // answeredCount
          return createQueryBuilder([{ count: 4 }]) as any
        case 5: // correctCount
          return createQueryBuilder([{ count: 3 }]) as any
        case 6: // totalVideos
          return createQueryBuilder([{ count: 2 }]) as any
        case 7: // watchedCount
          return createQueryBuilder([{ count: 1 }]) as any
        case 8: // watchTime
          return createQueryBuilder([{ totalTime: 1800 }]) as any
        default:
          return createQueryBuilder([{ count: 0 }]) as any
      }
    })

    vi.mocked(db.execute).mockResolvedValue([{ completed_count: 1 }] as any)

    const request = new Request(
      'http://localhost:3000/api/learning/progress?userId=other-user-id',
      {
        method: 'GET',
        headers: { cookie: 'session-token=admin-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.totalTasks).toBe(3)
  })

  it('should return 403 when non-admin tries to get other user progress', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'regular-user-id',
    })

    // Setup mock chain for user role check
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 'regular-user-id', role: 'user', name: 'Regular User' },
          ]),
        }),
      }),
    } as any)

    const request = new Request(
      'http://localhost:3000/api/learning/progress?userId=other-user-id',
      {
        method: 'GET',
        headers: { cookie: 'session-token=user-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('需要管理员权限')
  })

  it('should return 401 when no session', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request(
      'http://localhost:3000/api/learning/progress',
      {
        method: 'GET',
        headers: {},
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })
})
