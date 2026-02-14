import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { db } from '@/db'
import { quizAnswers, quizQuestions, tasks, quizSubmissions } from '@/db/schema'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve(undefined)),
    })),
  },
}))

// Mock authentication
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('POST /api/quiz/submit - 及格判定', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001'
  const mockTaskId = '660e8400-e29b-41d4-a716-446655440001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setupMocks = (options: {
    task?: any
    questions?: any[]
    submissions?: any[]
    quizAnswers?: any[]
  }) => {
    const { task, questions = [], submissions = [], quizAnswers: quizAns = [] } = options

    let callCount = 0
    const mockFrom = vi.fn().mockImplementation((table) => {
      return {
        where: vi.fn().mockImplementation(() => {
          callCount++
          // Determine which table is being queried based on call count
          if (table === tasks) {
            return Promise.resolve(task ? [task] : [])
          }
          if (table === quizQuestions) {
            return Promise.resolve(questions)
          }
          if (table === quizAnswers) {
            return Promise.resolve(quizAns)
          }
          if (table === quizSubmissions) {
            return Promise.resolve(submissions)
          }
          return Promise.resolve([])
        }),
      }
    })

    const mockSelect = vi.fn().mockImplementation((columns) => {
      return {
        from: mockFrom,
      }
    })

    vi.mocked(db.select).mockImplementation(mockSelect as any)

    // Mock insert
    const mockInsertValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({
      values: mockInsertValues,
    } as any)
  }

  it('strict_mode=true 时必须100分才能及格', async () => {
    const mockTask = {
      id: mockTaskId,
      passingScore: 60,
      strictMode: true,
    }

    const mockQuestions = [
      { id: '550e8400-e29b-41d4-a716-446655440011', question: 'Q1', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440012', question: 'Q2', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440013', question: 'Q3', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440014', question: 'Q4', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440015', question: 'Q5', options: ['A', 'B'], correctAnswer: 0 },
    ]

    setupMocks({
      task: mockTask,
      questions: mockQuestions,
      submissions: [],
      quizAnswers: [],
    })

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: mockUserId })

    const request = new Request('http://localhost:3000/api/quiz/submit', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        taskId: mockTaskId,
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440011', answer: 0 },
          { questionId: '550e8400-e29b-41d4-a716-446655440012', answer: 0 },
          { questionId: '550e8400-e29b-41d4-a716-446655440013', answer: 1 },
          { questionId: '550e8400-e29b-41d4-a716-446655440014', answer: 0 },
          { questionId: '550e8400-e29b-41d4-a716-446655440015', answer: 0 },
        ],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.score).toBe(4)
    expect(data.data.total).toBe(5)
    expect(data.data.passed).toBe(false)
  })

  it('strict_mode=false 时分数 >= passing_score 即可及格', async () => {
    const mockTask = {
      id: mockTaskId,
      passingScore: 60,
      strictMode: false,
    }

    const mockQuestions = [
      { id: '550e8400-e29b-41d4-a716-446655440021', question: 'Q1', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440022', question: 'Q2', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440023', question: 'Q3', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440024', question: 'Q4', options: ['A', 'B'], correctAnswer: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440025', question: 'Q5', options: ['A', 'B'], correctAnswer: 0 },
    ]

    setupMocks({
      task: mockTask,
      questions: mockQuestions,
      submissions: [],
      quizAnswers: [],
    })

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: mockUserId })

    const request = new Request('http://localhost:3000/api/quiz/submit', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        taskId: mockTaskId,
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440021', answer: 0 },
          { questionId: '550e8400-e29b-41d4-a716-446655440022', answer: 0 },
          { questionId: '550e8400-e29b-41d4-a716-446655440023', answer: 1 },
          { questionId: '550e8400-e29b-41d4-a716-446655440024', answer: 0 },
          { questionId: '550e8400-e29b-41d4-a716-446655440025', answer: 0 },
        ],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.score).toBe(4)
    expect(data.data.total).toBe(5)
    expect(data.data.passed).toBe(true)
  })

  it('提交次数超过3次应返回错误', async () => {
    const mockTask = {
      id: mockTaskId,
      passingScore: 60,
      strictMode: false,
    }

    const mockExistingSubmissions = [
      { id: '770e8400-e29b-41d4-a716-446655440001', passed: false },
      { id: '770e8400-e29b-41d4-a716-446655440002', passed: false },
      { id: '770e8400-e29b-41d4-a716-446655440003', passed: false },
    ]

    setupMocks({
      task: mockTask,
      submissions: mockExistingSubmissions,
    })

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: mockUserId })

    const request = new Request('http://localhost:3000/api/quiz/submit', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        taskId: mockTaskId,
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440031', answer: 0 },
        ],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('提交次数已用完')
  })

  it('已及格的用户不能再提交', async () => {
    const mockTask = {
      id: mockTaskId,
      passingScore: 60,
      strictMode: false,
    }

    const mockExistingSubmissions = [
      { id: '770e8400-e29b-41d4-a716-446655440011', passed: true },
    ]

    setupMocks({
      task: mockTask,
      submissions: mockExistingSubmissions,
    })

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: mockUserId })

    const request = new Request('http://localhost:3000/api/quiz/submit', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        taskId: mockTaskId,
        answers: [
          { questionId: '550e8400-e29b-41d4-a716-446655440041', answer: 0 },
        ],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('已达到及格分数')
  })
})
