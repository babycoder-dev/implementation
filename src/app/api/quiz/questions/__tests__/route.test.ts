import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { db } from '@/db'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock authentication
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('GET /api/quiz/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return questions for accessible task', async () => {
    const mockTask = {
      id: '660e8400-e29b-41d4-a716-446655440000',
      title: 'Test Task',
      description: 'Test Description',
      deadline: null,
      createdBy: 'admin-123',
      createdAt: new Date(),
    }

    const mockAssignment = {
      id: '770e8400-e29b-41d4-a716-446655440000',
      taskId: '660e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      assignedAt: new Date(),
    }

    const mockQuestions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        taskId: '660e8400-e29b-41d4-a716-446655440000',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        taskId: '660e8400-e29b-41d4-a716-446655440000',
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
      },
    ]

    // Track select calls to return different results
    let selectCallCount = 0

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        return Promise.resolve([mockTask])
      }
      if (selectCallCount === 2) {
        return Promise.resolve([mockAssignment])
      }
      return Promise.resolve(mockQuestions)
    })

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    // Third call (questions) doesn't use limit
    const mockQuestionsFrom = vi.fn().mockReturnThis()
    const mockQuestionsWhere = vi.fn().mockResolvedValue(mockQuestions)

    // Override the third select call for questions (no limit)
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: mockFrom,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom,
      } as any)
      .mockReturnValueOnce({
        from: mockQuestionsFrom,
      } as any)

    mockQuestionsFrom.mockReturnValue({
      where: mockQuestionsWhere,
    } as any)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

    const request = new Request(
      'http://localhost:3000/api/quiz/questions?taskId=660e8400-e29b-41d4-a716-446655440000',
      {
        method: 'GET',
        headers: { cookie: 'session-token=valid-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.data[0].question).toBe('What is 2 + 2?')
    expect(data.data[1].question).toBe('What is the capital of France?')
  })

  it('should not include correctAnswer in response', async () => {
    const mockTask = {
      id: '660e8400-e29b-41d4-a716-446655440000',
      title: 'Test Task',
      description: 'Test Description',
      deadline: null,
      createdBy: 'admin-123',
      createdAt: new Date(),
    }

    const mockAssignment = {
      id: '770e8400-e29b-41d4-a716-446655440000',
      taskId: '660e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      assignedAt: new Date(),
    }

    const mockQuestions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        taskId: '660e8400-e29b-41d4-a716-446655440000',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
      },
    ]

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn()

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    mockLimit
      .mockResolvedValueOnce([mockTask])
      .mockResolvedValueOnce([mockAssignment])

    const mockQuestionsFrom = vi.fn().mockReturnThis()
    const mockQuestionsWhere = vi.fn().mockResolvedValue(mockQuestions)

    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: mockFrom,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom,
      } as any)
      .mockReturnValueOnce({
        from: mockQuestionsFrom,
      } as any)

    mockQuestionsFrom.mockReturnValue({
      where: mockQuestionsWhere,
    } as any)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

    const request = new Request(
      'http://localhost:3000/api/quiz/questions?taskId=660e8400-e29b-41d4-a716-446655440000',
      {
        method: 'GET',
        headers: { cookie: 'session-token=valid-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data[0]).not.toHaveProperty('correctAnswer')
    expect(data.data[0]).toHaveProperty('id')
    expect(data.data[0]).toHaveProperty('taskId')
    expect(data.data[0]).toHaveProperty('question')
    expect(data.data[0]).toHaveProperty('options')
  })

  it('should return 403 for unauthorized task', async () => {
    const mockTask = {
      id: '660e8400-e29b-41d4-a716-446655440000',
      title: 'Test Task',
      description: 'Test Description',
      deadline: null,
      createdBy: 'admin-123',
      createdAt: new Date(),
    }

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn()

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    mockLimit
      .mockResolvedValueOnce([mockTask])
      .mockResolvedValueOnce([])

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

    const request = new Request(
      'http://localhost:3000/api/quiz/questions?taskId=660e8400-e29b-41d4-a716-446655440000',
      {
        method: 'GET',
        headers: { cookie: 'session-token=valid-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })

  it('should return 404 for non-existent task', async () => {
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([])

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

    const request = new Request(
      'http://localhost:3000/api/quiz/questions?taskId=660e8400-e29b-41d4-a716-446655440000',
      {
        method: 'GET',
        headers: { cookie: 'session-token=valid-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('任务不存在')
  })

  it('should return 401 when no session', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request(
      'http://localhost:3000/api/quiz/questions?taskId=660e8400-e29b-41d4-a716-446655440000',
      {
        method: 'GET',
        headers: { cookie: 'session-token=invalid-token' },
      }
    )

    const response = await GET(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })
})
