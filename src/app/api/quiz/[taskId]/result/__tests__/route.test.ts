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

  const createStatsMock = (result: any) => {
    const mockFrom = vi.fn().mockReturnThis()
    const mockLeftJoin = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockImplementation(() => Promise.resolve(result))
    mockFrom.mockReturnValue({ leftJoin: mockLeftJoin } as any)
    mockLeftJoin.mockReturnValue({ where: mockWhere } as any)
    return { from: mockFrom }
  }

  const createSubmissionsMock = (result: any) => {
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockOrderBy = vi.fn().mockResolvedValue(result)
    mockFrom.mockReturnValue({ where: mockWhere } as any)
    mockWhere.mockReturnValue({ orderBy: mockOrderBy } as any)
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
    const mockTask = { id: 'task-id', title: 'Test Task' }
    const mockUser = { id: 'user-id', role: 'user' }

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) return createSelectMock([mockTask])
      if (selectCallIndex === 2) return createSelectMock([mockUser])
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

  it('should return quiz result with answered questions and submissions', async () => {
    const mockTask = { id: 'task-id', title: 'Test Task' }
    const mockUser = { id: 'user-id', role: 'user' }
    const mockAssignment = { taskId: 'task-id', userId: 'user-id' }

    const mockStats = {
      totalQuestions: 5,
      answeredQuestions: 3,
      correctAnswers: 2,
      lastAnsweredAt: new Date('2024-01-01'),
    }

    const mockSubmissions = [
      {
        id: 'sub-1',
        score: '66.67',
        passed: false,
        totalQuestions: 5,
        correctAnswers: 3,
        attemptCount: 1,
        submittedAt: new Date('2024-01-01'),
      },
    ]

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) return createSelectMock([mockTask])
      if (selectCallIndex === 2) return createSelectMock([mockUser])
      if (selectCallIndex === 3) return createSelectMock([mockAssignment])
      if (selectCallIndex === 4) return createStatsMock([mockStats])
      return createSubmissionsMock(mockSubmissions)
    })

    const request = new Request('http://localhost:3000/api/quiz/task-id/result')
    const params = Promise.resolve({ taskId: 'task-id' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.taskId).toBe('task-id')
    expect(data.data.totalQuestions).toBe(5)
    expect(data.data.answeredQuestions).toBe(3)
    expect(data.data.correctAnswers).toBe(2)
    expect(data.data.accuracy).toBe(67) // round(2/3 * 100) = 67
    expect(data.data.userAttempts).toBe(1)
    expect(data.data.hasPassed).toBe(false)
    expect(data.data.submissions).toHaveLength(1)
  })

  it('should return correct best score from passed submissions', async () => {
    const mockTask = { id: 'task-id', title: 'Test Task' }
    const mockUser = { id: 'user-id', role: 'user' }
    const mockAssignment = { taskId: 'task-id', userId: 'user-id' }

    const mockStats = {
      totalQuestions: 5,
      answeredQuestions: 5,
      correctAnswers: 4,
      lastAnsweredAt: new Date('2024-01-02'),
    }

    const mockSubmissions = [
      {
        id: 'sub-2',
        score: '60.00',
        passed: false,
        totalQuestions: 5,
        correctAnswers: 3,
        attemptCount: 2,
        submittedAt: new Date('2024-01-02'),
      },
      {
        id: 'sub-1',
        score: '80.00',
        passed: true,
        totalQuestions: 5,
        correctAnswers: 4,
        attemptCount: 1,
        submittedAt: new Date('2024-01-01'),
      },
    ]

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) return createSelectMock([mockTask])
      if (selectCallIndex === 2) return createSelectMock([mockUser])
      if (selectCallIndex === 3) return createSelectMock([mockAssignment])
      if (selectCallIndex === 4) return createStatsMock([mockStats])
      return createSubmissionsMock(mockSubmissions)
    })

    const request = new Request('http://localhost:3000/api/quiz/task-id/result')
    const params = Promise.resolve({ taskId: 'task-id' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.hasPassed).toBe(true)
    expect(data.data.bestScore).toEqual({
      score: '80.00',
      attemptCount: 1,
    })
  })

  it('should allow admin to access any task result', async () => {
    const mockTask = { id: 'task-id', title: 'Test Task' }
    const mockAdmin = { id: 'admin-id', role: 'admin' }

    const mockStats = {
      totalQuestions: 5,
      answeredQuestions: 3,
      correctAnswers: 2,
      lastAnsweredAt: new Date(),
    }

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) return createSelectMock([mockTask])
      if (selectCallIndex === 2) return createSelectMock([mockAdmin])
      if (selectCallIndex === 3) return createStatsMock([mockStats])
      return createSubmissionsMock([])
    })

    const request = new Request('http://localhost:3000/api/quiz/task-id/result')
    const params = Promise.resolve({ taskId: 'task-id' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 0 attempts when no submissions', async () => {
    const mockTask = { id: 'task-id', title: 'Test Task' }
    const mockUser = { id: 'user-id', role: 'user' }
    const mockAssignment = { taskId: 'task-id', userId: 'user-id' }

    const mockStats = {
      totalQuestions: 5,
      answeredQuestions: 0,
      correctAnswers: 0,
      lastAnsweredAt: null,
    }

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) return createSelectMock([mockTask])
      if (selectCallIndex === 2) return createSelectMock([mockUser])
      if (selectCallIndex === 3) return createSelectMock([mockAssignment])
      if (selectCallIndex === 4) return createStatsMock([mockStats])
      return createSubmissionsMock([])
    })

    const request = new Request('http://localhost:3000/api/quiz/task-id/result')
    const params = Promise.resolve({ taskId: 'task-id' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.userAttempts).toBe(0)
    expect(data.data.hasPassed).toBe(false)
    expect(data.data.bestScore).toBe(null)
    expect(data.data.accuracy).toBe(0)
    expect(data.data.submissions).toHaveLength(0)
  })

  it('should handle multiple passed submissions and return best score', async () => {
    const mockTask = { id: 'task-id', title: 'Test Task' }
    const mockUser = { id: 'user-id', role: 'user' }
    const mockAssignment = { taskId: 'task-id', userId: 'user-id' }

    const mockStats = {
      totalQuestions: 5,
      answeredQuestions: 5,
      correctAnswers: 5,
      lastAnsweredAt: new Date('2024-01-03'),
    }

    const mockSubmissions = [
      {
        id: 'sub-3',
        score: '100.00',
        passed: true,
        totalQuestions: 5,
        correctAnswers: 5,
        attemptCount: 3,
        submittedAt: new Date('2024-01-03'),
      },
      {
        id: 'sub-2',
        score: '80.00',
        passed: true,
        totalQuestions: 5,
        correctAnswers: 4,
        attemptCount: 2,
        submittedAt: new Date('2024-01-02'),
      },
      {
        id: 'sub-1',
        score: '60.00',
        passed: false,
        totalQuestions: 5,
        correctAnswers: 3,
        attemptCount: 1,
        submittedAt: new Date('2024-01-01'),
      },
    ]

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) return createSelectMock([mockTask])
      if (selectCallIndex === 2) return createSelectMock([mockUser])
      if (selectCallIndex === 3) return createSelectMock([mockAssignment])
      if (selectCallIndex === 4) return createStatsMock([mockStats])
      return createSubmissionsMock(mockSubmissions)
    })

    const request = new Request('http://localhost:3000/api/quiz/task-id/result')
    const params = Promise.resolve({ taskId: 'task-id' })

    const response = await GET(request as any, { params } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.hasPassed).toBe(true)
    expect(data.data.bestScore).toEqual({
      score: '80.00',
      attemptCount: 2,
    })
    expect(data.data.userAttempts).toBe(3)
    expect(data.data.accuracy).toBe(100)
  })
})
