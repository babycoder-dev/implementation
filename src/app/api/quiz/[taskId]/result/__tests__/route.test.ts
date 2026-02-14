import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { db } from '@/db'
import { users } from '@/db/schema'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock authentication
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('GET /api/quiz/[taskId]/result', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createSelectMock = (result: any) => {
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue(result)
    mockFrom.mockReturnValue({ where: mockWhere } as any)
    mockWhere.mockReturnValue({ limit: mockLimit } as any)
    return { from: mockFrom }
  }

  it('should return 401 when not authenticated', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/quiz/123/result')
    const params = Promise.resolve({ taskId: '123' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('should return 404 when task not found', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    vi.mocked(db.select).mockImplementation(() => createSelectMock([]))

    const request = new Request('http://localhost:3000/api/quiz/123/result')
    const params = Promise.resolve({ taskId: '123' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('任务不存在')
  })

  it('should return 403 when user has no task assignment', async () => {
    const mockTask = {
      id: 'task-id',
      title: 'Test Task',
    }

    const mockUser = {
      id: 'user-id',
      role: 'user',
    }

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) {
        return createSelectMock([mockTask])
      }
      if (selectCallIndex === 2) {
        return createSelectMock([mockUser])
      }
      return createSelectMock([])
    })

    const request = new Request('http://localhost:3000/api/quiz/task-id/result')
    const params = Promise.resolve({ taskId: 'task-id' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })
})
