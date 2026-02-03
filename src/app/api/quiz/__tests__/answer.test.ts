import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../answer/route'
import { db } from '@/db'
import { quizAnswers, quizQuestions } from '@/db/schema'

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

describe('POST /api/quiz/answer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit an answer', async () => {
    const mockQuestion = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      taskId: '660e8400-e29b-41d4-a716-446655440000',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
    }

    // Track calls to return different results
    let selectCallCount = 0

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockImplementation(() => {
      selectCallCount++
      // First call: return question, second call: return empty array (no existing answer)
      if (selectCallCount === 1) {
        return Promise.resolve([mockQuestion])
      }
      return Promise.resolve([])
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

    // Mock insert
    const mockInsertValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockInsertValues,
    } as any)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

    // Answer is correct (index 1)
    const request = new Request('http://localhost:3000/api/quiz/answer', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 1,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.isCorrect).toBe(true)
  })

  it('should not allow duplicate answers', async () => {
    const mockQuestion = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      taskId: '660e8400-e29b-41d4-a716-446655440000',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
    }

    const mockExistingAnswer = {
      id: '770e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      questionId: '550e8400-e29b-41d4-a716-446655440000',
      answer: 0,
      isCorrect: false,
      answeredAt: new Date(),
    }

    // First call returns question, second call returns existing answer
    let selectCallCount = 0

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        return Promise.resolve([mockQuestion])
      }
      return Promise.resolve([mockExistingAnswer])
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

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

    const request = new Request('http://localhost:3000/api/quiz/answer', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 1,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('已回答过此题目')
  })

  it('should return 401 for unauthorized request', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/quiz/answer', {
      method: 'POST',
      headers: { cookie: 'session-token=invalid-token' },
      body: JSON.stringify({
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('should return 404 for non-existent question', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-123' })

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

    const request = new Request('http://localhost:3000/api/quiz/answer', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 0,
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('题目不存在')
  })
})
