import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { db } from '@/db'
import type { NextRequest } from 'next/server'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
  },
}))

// Mock session validation
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
  })

  it('should return 401 when no session', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

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

    // Mock user query
    const mockUserFrom = vi.fn().mockReturnThis()
    const mockUserWhere = vi.fn().mockReturnThis()
    const mockUserLimit = vi.fn().mockResolvedValue([mockAdminUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockUserFrom,
    } as unknown)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as unknown)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as unknown)

    // Mock task query - task not found
    const mockTaskFrom = vi.fn().mockReturnThis()
    const mockTaskWhere = vi.fn().mockReturnThis()
    const mockTaskLimit = vi.fn().mockResolvedValue([])

    vi.mocked(db.select).mockReturnValueOnce({
      from: mockUserFrom,
    } as unknown)

    vi.mocked(db.select).mockReturnValueOnce({
      from: mockTaskFrom,
    } as unknown)

    mockTaskFrom.mockReturnValue({
      where: mockTaskWhere,
    } as unknown)

    mockTaskWhere.mockReturnValue({
      limit: mockTaskLimit,
    } as unknown)

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

    // Create mock chain for user query
    const mockUserLimit = vi.fn().mockResolvedValue([mockAdminUser])
    const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit })
    const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere })

    // Create mock chain for task query
    const mockTaskLimit = vi.fn().mockResolvedValue([mockTask])
    const mockTaskWhere = vi.fn().mockReturnValue({ limit: mockTaskLimit })
    const mockTaskFrom = vi.fn().mockReturnValue({ where: mockTaskWhere })

    // Create mock chain for files query
    const mockFilesOrderBy = vi.fn().mockResolvedValue(mockFiles)
    const mockFilesWhere = vi.fn().mockReturnValue({ orderBy: mockFilesOrderBy })
    const mockFilesFrom = vi.fn().mockReturnValue({ where: mockFilesWhere })

    // Create mock chain for questions query
    const mockQuestionsWhere = vi.fn().mockResolvedValue(mockQuestions)
    const mockQuestionsFrom = vi.fn().mockReturnValue({ where: mockQuestionsWhere })

    // Setup db.select mock to return appropriate chains
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockUserFrom } as unknown)
      .mockReturnValueOnce({ from: mockTaskFrom } as unknown)
      .mockReturnValueOnce({ from: mockFilesFrom } as unknown)
      .mockReturnValueOnce({ from: mockQuestionsFrom } as unknown)

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
    // Ensure correctAnswer is not included
    expect(data.questions[0].correctAnswer).toBeUndefined()
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

    // Create mock chain for user query
    const mockUserLimit = vi.fn().mockResolvedValue([mockRegularUser])
    const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit })
    const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere })

    // Create mock chain for task query
    const mockTaskLimit = vi.fn().mockResolvedValue([mockTask])
    const mockTaskWhere = vi.fn().mockReturnValue({ limit: mockTaskLimit })
    const mockTaskFrom = vi.fn().mockReturnValue({ where: mockTaskWhere })

    // Create mock chain for assignment query
    const mockAssignmentLimit = vi.fn().mockResolvedValue([mockAssignment])
    const mockAssignmentWhere = vi.fn().mockReturnValue({ limit: mockAssignmentLimit })
    const mockAssignmentFrom = vi.fn().mockReturnValue({ where: mockAssignmentWhere })

    // Create mock chain for files query
    const mockFilesOrderBy = vi.fn().mockResolvedValue(mockFiles)
    const mockFilesWhere = vi.fn().mockReturnValue({ orderBy: mockFilesOrderBy })
    const mockFilesFrom = vi.fn().mockReturnValue({ where: mockFilesWhere })

    // Create mock chain for questions query
    const mockQuestionsWhere = vi.fn().mockResolvedValue(mockQuestions)
    const mockQuestionsFrom = vi.fn().mockReturnValue({ where: mockQuestionsWhere })

    // Setup db.select mock to return appropriate chains
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockUserFrom } as unknown)
      .mockReturnValueOnce({ from: mockTaskFrom } as unknown)
      .mockReturnValueOnce({ from: mockAssignmentFrom } as unknown)
      .mockReturnValueOnce({ from: mockFilesFrom } as unknown)
      .mockReturnValueOnce({ from: mockQuestionsFrom } as unknown)

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

    // Create mock chain for user query
    const mockUserLimit = vi.fn().mockResolvedValue([mockRegularUser])
    const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit })
    const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere })

    // Create mock chain for task query
    const mockTaskLimit = vi.fn().mockResolvedValue([mockTask])
    const mockTaskWhere = vi.fn().mockReturnValue({ limit: mockTaskLimit })
    const mockTaskFrom = vi.fn().mockReturnValue({ where: mockTaskWhere })

    // Create mock chain for assignment query - no assignment found
    const mockAssignmentLimit = vi.fn().mockResolvedValue([])
    const mockAssignmentWhere = vi.fn().mockReturnValue({ limit: mockAssignmentLimit })
    const mockAssignmentFrom = vi.fn().mockReturnValue({ where: mockAssignmentWhere })

    // Setup db.select mock to return appropriate chains
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockUserFrom } as unknown)
      .mockReturnValueOnce({ from: mockTaskFrom } as unknown)
      .mockReturnValueOnce({ from: mockAssignmentFrom } as unknown)

    const request = createMockRequest('task-id', 'session-token=valid-user-token')
    const response = await GET(request, { params: Promise.resolve({ id: 'task-id' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })
})
