import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import type { NextRequest } from 'next/server'

// Create mock functions at module level
const mockUserFrom = vi.fn()
const mockTaskFrom = vi.fn()
const mockFilesFrom = vi.fn()
const mockQuestionsFrom = vi.fn()
const mockTaskAssignmentsFrom = vi.fn()
const mockUsersFrom = vi.fn()

// Create mock db
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// Setup mock for db module
vi.mock('@/db', () => ({
  db: mockDb,
}))

// Setup mock for auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

function createMockRequest(taskId: string, cookie?: string): NextRequest {
  return new Request(`http://localhost:3000/api/tasks/${taskId}`, {
    method: 'GET',
    headers: cookie ? { cookie } : {},
  }) as unknown as NextRequest
}

describe('GET /api/tasks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFrom.mockReset()
    mockTaskFrom.mockReset()
    mockFilesFrom.mockReset()
    mockQuestionsFrom.mockReset()
    mockTaskAssignmentsFrom.mockReset()
    mockUsersFrom.mockReset()
    mockDb.select.mockReset()
  })

  it('should return 401 when no session', async () => {
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

  it('should return 404 when task not found', async () => {
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
    mockUserFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAdminUser])
      })
    })

    // Task query returns empty
    mockTaskFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockUserFrom })
      .mockReturnValueOnce({ from: mockTaskFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('non-existent-task', 'session-token=valid-admin-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-task' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('任务不存在')
  })

  it('should allow admin to get any task', async () => {
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
      title: 'Test Task',
      description: 'Test Description',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: 'admin-id',
      createdAt: new Date(),
    }

    const mockFiles = [
      {
        id: 'file-1',
        title: 'Test File',
        fileUrl: 'https://example.com/file.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        order: 0,
      },
    ]

    const mockQuestions = [
      {
        id: 'question-1',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
      },
    ]

    const mockAssignedUsers = [{ id: 'user-id', name: 'User', username: 'user' }]

    // User query
    mockUserFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockAdminUser])
      })
    })

    // Task query
    mockTaskFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockTask])
      })
    })

    // Files query
    mockFilesFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockFiles)
      })
    })

    // Questions query
    mockQuestionsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue(mockQuestions)
    })

    // Task assignments query (for assigned users)
    mockTaskAssignmentsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue([{ userId: 'user-id' }])
    })

    // Users query (for assigned users)
    mockUsersFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue(mockAssignedUsers)
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockUserFrom })
      .mockReturnValueOnce({ from: mockTaskFrom })
      .mockReturnValueOnce({ from: mockFilesFrom })
      .mockReturnValueOnce({ from: mockQuestionsFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockUsersFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('task-id', 'session-token=valid-admin-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.task).toBeDefined()
    expect(data.task.id).toBe('task-id')
    expect(data.task.title).toBe('Test Task')
    expect(data.files).toHaveLength(1)
    expect(data.files[0].title).toBe('Test File')
    expect(data.questions).toHaveLength(1)
    expect(data.questions[0].question).toBe('What is 2 + 2?')
  })

  it('should allow user to get assigned task', async () => {
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
      title: 'Assigned Task',
      description: 'Task assigned to user',
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
    }

    const mockAssignment = {
      id: 'assignment-id',
      taskId: 'task-id',
      userId: 'user-id',
      assignedAt: new Date(),
    }

    const mockFiles: unknown[] = []
    const mockQuestions: unknown[] = []

    // User query
    mockUserFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Task query
    mockTaskFrom.mockReturnValue({
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

    // Files query
    mockFilesFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockFiles)
      })
    })

    // Questions query
    mockQuestionsFrom.mockReturnValue({
      where: vi.fn().mockResolvedValue(mockQuestions)
    })

    mockDb.select
      .mockReturnValueOnce({ from: mockUserFrom })
      .mockReturnValueOnce({ from: mockTaskFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })
      .mockReturnValueOnce({ from: mockFilesFrom })
      .mockReturnValueOnce({ from: mockQuestionsFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('task-id', 'session-token=valid-user-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.task).toBeDefined()
    expect(data.task.id).toBe('task-id')
  })

  it('should return 403 when user tries to access unassigned task', async () => {
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
    }

    // User query
    mockUserFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRegularUser])
      })
    })

    // Task query
    mockTaskFrom.mockReturnValue({
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
      .mockReturnValueOnce({ from: mockUserFrom })
      .mockReturnValueOnce({ from: mockTaskFrom })
      .mockReturnValueOnce({ from: mockTaskAssignmentsFrom })

    const { GET } = await import('../route')
    const request = createMockRequest('task-id', 'session-token=valid-user-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })
})
