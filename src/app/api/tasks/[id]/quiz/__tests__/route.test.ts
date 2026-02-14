import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Use vi.hoisted to define mocks that can be referenced in vi.mock
const { mockUsersFrom, mockTasksFrom, mockQuizQuestionsFrom, mockQuizSubmissionsFrom, mockTaskAssignmentsFrom, mockQuizQuestionsInsert, mockQuizQuestionsValues, mockDb } = vi.hoisted(() => {
  const mockUsersFrom = vi.fn()
  const mockTasksFrom = vi.fn()
  const mockQuizQuestionsFrom = vi.fn()
  const mockQuizSubmissionsFrom = vi.fn()
  const mockTaskAssignmentsFrom = vi.fn()
  const mockQuizQuestionsInsert = vi.fn()
  const mockQuizQuestionsValues = vi.fn()

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  return {
    mockUsersFrom,
    mockTasksFrom,
    mockQuizQuestionsFrom,
    mockQuizSubmissionsFrom,
    mockTaskAssignmentsFrom,
    mockQuizQuestionsInsert,
    mockQuizQuestionsValues,
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
import { GET, POST } from '../route'

function createMockRequest(taskId: string, cookie?: string): NextRequest {
  return new Request(`http://localhost:3000/api/tasks/${taskId}/quiz`, {
    method: 'GET',
    headers: cookie ? { cookie } : {},
  }) as unknown as NextRequest
}

describe('GET /api/tasks/[id]/quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersFrom.mockReset()
    mockTasksFrom.mockReset()
    mockQuizQuestionsFrom.mockReset()
    mockQuizSubmissionsFrom.mockReset()
    mockTaskAssignmentsFrom.mockReset()
    mockDb.select.mockReset()
  })

  it('应返回测验信息包含 passing_score 和 strict_mode', async () => {
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

    const mockTask = {
      id: 'task-id',
      title: 'Test Task',
      description: 'Test Description',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: 'admin-id',
      createdAt: new Date(),
      passingScore: 60,
      strictMode: false,
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    const mockSubmissions = [
      {
        id: 'submission-1',
        taskId: 'task-id',
        userId: 'user-id',
        score: '50.00',
        passed: false,
        totalQuestions: 5,
        correctAnswers: 3,
        attemptCount: 1,
        answers: {},
        submittedAt: new Date(),
      },
    ]

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Task query
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAssignment])
      })
    })

    // For count query: db.select({ count: count() }).from(quizQuestions)...
    // It returns [{ count: 5 }]
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 5 }])
    })

    // Submissions query
    mockQuizSubmissionsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue(mockSubmissions)
    })

    // Setup select chain - 5 calls total
    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })       // 1: get user
      .mockReturnValueOnce({ from: mockTasksFrom })       // 2: get task
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom }) // 3: check assignment
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })  // 4: count questions
      .mockReturnValueOnce({ from: mockQuizSubmissionsFrom }) // 5: get submissions

    const { GET } = await import('../route')
    const request = createMockRequest('task-id', 'session-token=valid-user-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.taskId).toBe('task-id')
    expect(data.data.title).toBe('Test Task')
    expect(data.data.totalQuestions).toBe(5)
    expect(data.data.passingScore).toBe(60)
    expect(data.data.strictMode).toBe(false)
    expect(data.data.userAttempts).toBe(1)
    expect(data.data.hasPassed).toBe(false)
  })

  it('未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const { GET } = await import('../route')
    const request = createMockRequest('task-id')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('任务不存在应返回404', async () => {
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

    // User query returns user
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAdminUser])
      })
    })

    // Task query returns empty
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTasksFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('non-existent-task', 'session-token=valid-admin-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-task' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('任务不存在')
  })

  it('用户未分配任务应返回403', async () => {
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

    const mockTask = {
      id: 'task-id',
      title: 'Unassigned Task',
      description: 'Task not assigned to user',
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
      passingScore: 60,
      strictMode: true,
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Task query
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Assignment query - empty
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTasksFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('task-id', 'session-token=valid-user-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })

  it('管理员可以查看任何任务', async () => {
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

    const mockTask = {
      id: 'task-id',
      title: 'Admin Task',
      description: 'Task for admin',
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
      passingScore: 80,
      strictMode: true,
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAdminUser])
      })
    })

    // Task query
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Questions query
    mockQuizQuestionsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 'q1' }])
    })

    // Submissions query (empty for admin)
    mockQuizSubmissionsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue([])
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockUsersFrom })
      .mockReturnValueOnce({ from: mockTasksFrom })
      .mockReturnValueOnce({ from: mockQuizQuestionsFrom })
      .mockReturnValueOnce({ from: mockQuizSubmissionsFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('task-id', 'session-token=valid-admin-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.taskId).toBe('task-id')
    expect(data.data.title).toBe('Admin Task')
    expect(data.data.passingScore).toBe(80)
    expect(data.data.strictMode).toBe(true)
    expect(data.data.userAttempts).toBe(0)
    expect(data.data.hasPassed).toBe(false)
  })
})

describe('POST /api/tasks/[id]/quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('缺少必要参数应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        question: 'Test question?',
        // missing options and correctAnswer
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('缺少必要参数')
  })

  it('选项不是4个应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C'], // only 3 options
        correctAnswer: 0,
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('选项必须为4个')
  })

  it('正确答案索引超出范围应返回400', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 5, // invalid index
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('正确答案索引必须在0-3之间')
  })

  it('任务不存在应返回404', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          id: 'user-id',
          username: 'user',
          passwordHash: 'hash',
          name: 'User',
          role: 'user',
          createdAt: new Date(),
        }])
      })
    })

    // Task query returns empty
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockTasksFrom })  // tasks first
      .mockReturnValueOnce({ from: mockUsersFrom })   // users second

    const request = new Request('http://localhost:3000/api/tasks/non-existent-task/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent-task' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('任务不存在')
  })

  it('用户未分配任务应返回403', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockTask = {
      id: 'task-id',
      title: 'Test Task',
      description: 'Test',
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
      passingScore: 60,
      strictMode: false,
    }

    // Reset mocks
    mockDb.select.mockReset()

    // User query
    mockUsersFrom.mockReset()
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          id: 'user-id',
          username: 'user',
          passwordHash: 'hash',
          name: 'User',
          role: 'user',
          createdAt: new Date(),
        }])
      })
    })

    // Task query
    mockTasksFrom.mockReset()
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Assignment query returns empty
    mockTaskAssignmentsFrom.mockReset()
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockTasksFrom })  // tasks first
      .mockReturnValueOnce({ from: mockUsersFrom })   // users second
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })  // assignments third

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })

  it('成功创建题目应返回201', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    const mockTask = {
      id: 'task-id',
      title: 'Test Task',
      description: 'Test',
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
      passingScore: 60,
      strictMode: false,
    }

    const mockNewQuestion = {
      id: 'new-question-id',
      taskId: 'task-id',
      question: 'Test question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
    }

    // User query
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          id: 'user-id',
          username: 'user',
          passwordHash: 'hash',
          name: 'User',
          role: 'user',
          createdAt: new Date(),
        }])
      })
    })

    // Task query
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Assignment query
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 'assignment-id' }])
      })
    })

    // Mock insert - need to mock the full chain: db.insert().values().returning()
    const mockReturning = vi.fn().mockResolvedValue([mockNewQuestion])
    const mockValues = vi.fn().mockReturnValue({
      returning: mockReturning
    })

    // Reset insert mock to return proper chain
    mockDb.insert.mockReset()
    mockDb.insert.mockReturnValue({
      values: mockValues
    } as any)

    mockDb.select
      .mockReturnValueOnce({ from: mockTasksFrom })  // tasks first
      .mockReturnValueOnce({ from: mockUsersFrom })   // users second
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })  // assignments third

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.question).toBe('Test question?')
  })

  it('管理员可以创建题目无需分配', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    const mockTask = {
      id: 'task-id',
      title: 'Test Task',
      description: 'Test',
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
      passingScore: 60,
      strictMode: false,
    }

    const mockNewQuestion = {
      id: 'new-question-id',
      taskId: 'task-id',
      question: 'Admin question?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 1,
    }

    // Reset mocks before setting up
    mockDb.select.mockReset()
    mockDb.insert.mockReset()

    // User query - admin
    mockUsersFrom.mockReset()
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          id: 'admin-id',
          username: 'admin',
          passwordHash: 'hash',
          name: 'Admin',
          role: 'admin',
          createdAt: new Date(),
        }])
      })
    })

    // Task query
    mockTasksFrom.mockReset()
    mockTasksFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Mock insert - need to mock the full chain: db.insert().values().returning()
    const mockReturning = vi.fn().mockResolvedValue([mockNewQuestion])
    const mockValues = vi.fn().mockReturnValue({
      returning: mockReturning
    })
    mockDb.insert.mockReturnValue({
      values: mockValues
    } as any)

    // Route does tasks query first, then users query
    mockDb.select
      .mockReturnValueOnce({ from: mockTasksFrom })  // tasks first
      .mockReturnValueOnce({ from: mockUsersFrom })  // users second

    const request = new Request('http://localhost:3000/api/tasks/task-id/quiz', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-admin-token' },
      body: JSON.stringify({
        question: 'Admin question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 1,
      }),
    }) as unknown as NextRequest

    const response = await POST(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.question).toBe('Admin question?')
  })
})
