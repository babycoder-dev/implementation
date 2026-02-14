import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Use vi.hoisted to define mocks that can be referenced in vi.mock
const { mockUsersFrom, mockQuizQuestionsFrom, mockTaskAssignmentsFrom, mockDb } = vi.hoisted(() => {
  const mockUsersFrom = vi.fn()
  const mockQuizQuestionsFrom = vi.fn()
  const mockTaskAssignmentsFrom = vi.fn()

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  return {
    mockUsersFrom,
    mockQuizQuestionsFrom,
    mockTaskAssignmentsFrom,
    mockDb,
  }
})

// Setup mock for db module
vi.mock('@/db', () => ({
  db: mockDb,
}))

// Setup mock for auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

// Import after mocks are set up
import { PUT, DELETE } from '../route'

function createMockRequest(
  method: string,
  taskId: string,
  questionId: string,
  body?: unknown,
  cookie?: string
): NextRequest {
  return new Request(`http://localhost:3000/api/tasks/${taskId}/quiz/${questionId}`, {
    method,
    headers: cookie ? { cookie, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest
}

describe('PUT /api/tasks/[id]/quiz/[questionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersFrom.mockReset()
    mockQuizQuestionsFrom.mockReset()
    mockTaskAssignmentsFrom.mockReset()
    mockDb.select.mockReset()
    mockDb.update.mockReset()
  })

  it('PUT: 成功更新题目应返回200', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Original question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockUpdatedQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Updated question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 1,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Mock update chain
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockUpdatedQuestion])
    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockUpdateReturning
      })
    })
    mockDb.update.mockReturnValue({
      set: mockUpdateSet
    } as any)

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      {
        question: 'Updated question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 1,
      },
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.question).toBe('Updated question?')
    expect(data.data.correctAnswer).toBe(1)
  })

  it('PUT: 题目不存在应返回404', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query returns empty
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'non-existent-question',
      { question: 'Updated?' },
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'non-existent-question' })
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('题目不存在')
  })

  it('PUT: 题目不属于此任务应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    // Question belongs to different task
    const mockQuestion = {
      id: 'question-id',
      taskId: 'different-task-id',
      question: 'Question from other task',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      { question: 'Updated?' },
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('题目不属于此任务')
  })

  it('PUT: 无效输入验证应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Original question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    // Test: options not equal to 4
    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      { options: ['A', 'B', 'C'] }, // only 3 options
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('选项必须为4个')
  })

  it('PUT: 正确答案索引超出范围应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Original question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      { options: ['A', 'B', 'C', 'D'], correctAnswer: 5 }, // invalid index
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('正确答案索引必须在0-3之间')
  })

  it('PUT: 无任何更新字段应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Original question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      {}, // no fields to update
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('至少需要一个要更新的字段')
  })

  it('PUT: 未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      { question: 'Updated?' }
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('PUT: 无权限访问任务应返回403', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query returns empty (no access)
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    // Select calls: users (1), assignments (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      { question: 'Updated?' },
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })

  it('PUT: 管理员可以更新任何任务的题目', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Original question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockUpdatedQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Admin updated question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 2,
    }

    // User query - admin
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAdminUser])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Mock update chain
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockUpdatedQuestion])
    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockUpdateReturning
      })
    })
    mockDb.update.mockReturnValue({
      set: mockUpdateSet
    } as any)

    // Select calls: users (1), questions (1) - admin skips assignment check
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      {
        question: 'Admin updated question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 2,
      },
      'session-token=valid-admin-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.question).toBe('Admin updated question?')
    expect(data.data.correctAnswer).toBe(2)
  })
})

describe('DELETE /api/tasks/[id]/quiz/[questionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersFrom.mockReset()
    mockQuizQuestionsFrom.mockReset()
    mockTaskAssignmentsFrom.mockReset()
    mockDb.select.mockReset()
    mockDb.delete.mockReset()
  })

  it('DELETE: 成功删除题目应返回200', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Question to delete?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Mock delete chain
    const mockDeleteWhere = vi.fn().mockResolvedValue([])
    mockDb.delete.mockReturnValue({
      where: mockDeleteWhere
    } as any)

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest('DELETE', 'task-id', 'question-id', undefined, 'session-token=valid-user-token')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('题目已删除')
  })

  it('DELETE: 题目不存在应返回404', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query returns empty
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest('DELETE', 'task-id', 'non-existent-question', undefined, 'session-token=valid-user-token')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'non-existent-question' })
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('题目不存在')
  })

  it('DELETE: 题目不属于此任务应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    // Question belongs to different task
    const mockQuestion = {
      id: 'question-id',
      taskId: 'different-task-id',
      question: 'Question from other task',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest('DELETE', 'task-id', 'question-id', undefined, 'session-token=valid-user-token')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('题目不属于此任务')
  })

  it('DELETE: 未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = createMockRequest('DELETE', 'task-id', 'question-id')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('DELETE: 无权限访问任务应返回403', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query returns empty (no access)
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    // Select calls: users (1), assignments (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })

    const request = createMockRequest('DELETE', 'task-id', 'question-id', undefined, 'session-token=valid-user-token')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })

  it('DELETE: 管理员可以删除任何任务的题目', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Question to delete?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    // User query - admin
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAdminUser])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Mock delete chain
    const mockDeleteWhere = vi.fn().mockResolvedValue([])
    mockDb.delete.mockReturnValue({
      where: mockDeleteWhere
    } as any)

    // Select calls: users (1), questions (1) - admin skips assignment check
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest('DELETE', 'task-id', 'question-id', undefined, 'session-token=valid-admin-token')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('题目已删除')
  })

  it('PUT: 数据库错误应返回500', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Original question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Mock update to throw error
    const mockUpdateSet = vi.fn().mockImplementation(() => {
      throw new Error('Database error')
    })
    mockDb.update.mockReturnValue({
      set: mockUpdateSet
    } as any)

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest(
      'PUT',
      'task-id',
      'question-id',
      { question: 'Updated?' },
      'session-token=valid-user-token'
    )

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })

  it('DELETE: 数据库错误应返回500', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    const mockQuestion = {
      id: 'question-id',
      taskId: 'task-id',
      question: 'Question to delete?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // Question query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockQuestion])
      })
    })

    // Mock delete to throw error
    const mockDeleteWhere = vi.fn().mockImplementation(() => {
      throw new Error('Database error')
    })
    mockDb.delete.mockReturnValue({
      where: mockDeleteWhere
    } as any)

    // Select calls: users (1), assignments (1), questions (1)
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })

    const request = createMockRequest('DELETE', 'task-id', 'question-id', undefined, 'session-token=valid-user-token')

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'task-id', questionId: 'question-id' })
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })
})
