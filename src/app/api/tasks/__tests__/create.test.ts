import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { db } from '@/db'
import { users, tasks, taskAssignments, taskFiles, quizQuestions } from '@/db/schema'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock session validation
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new task', async () => {
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

    // Mock validateRequest
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    // Mock user query
    const mockUserFrom = vi.fn().mockReturnThis()
    const mockUserWhere = vi.fn().mockReturnThis()
    const mockUserLimit = vi.fn().mockResolvedValue([mockAdminUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockUserFrom,
    } as any)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as any)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as any)

    // Mock task insert
    const mockTaskInsertValues = vi.fn().mockReturnThis()
    const mockTaskInsertReturning = vi.fn().mockResolvedValue([mockTask])

    vi.mocked(db.insert).mockReturnValue({
      values: mockTaskInsertValues,
    } as any)

    mockTaskInsertValues.mockReturnValue({
      returning: mockTaskInsertReturning,
    } as any)

    const request = new Request('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-admin-token' },
      body: JSON.stringify({
        title: 'Test Task',
        description: 'Test Description',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        assignedUserIds: ['user-1', 'user-2'],
        files: [
          {
            title: 'Test File',
            fileType: 'pdf',
            fileUrl: 'https://example.com/file.pdf',
            fileSize: 1024,
          },
        ],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.task).toBeDefined()
  })

  it('should require admin role', async () => {
    const mockRegularUser = {
      id: 'user-id',
      username: 'user',
      passwordHash: 'hash',
      name: 'User',
      role: 'user',
      createdAt: new Date(),
    }

    // Mock validateRequest
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })

    // Mock user query
    const mockUserFrom = vi.fn().mockReturnThis()
    const mockUserWhere = vi.fn().mockReturnThis()
    const mockUserLimit = vi.fn().mockResolvedValue([mockRegularUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockUserFrom,
    } as any)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as any)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as any)

    const request = new Request('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-user-token' },
      body: JSON.stringify({
        title: 'Test Task',
        assignedUserIds: ['user-1'],
        files: [{ title: 'Test', fileType: 'pdf', fileUrl: 'https://example.com/file.pdf', fileSize: 1024 }],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('should return error for unauthorized request', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { cookie: 'session-token=invalid-token' },
      body: JSON.stringify({
        title: 'Test Task',
        assignedUserIds: ['user-1'],
        files: [{ title: 'Test', fileType: 'pdf', fileUrl: 'https://example.com/file.pdf', fileSize: 1024 }],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return error for invalid request body', async () => {
    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
      createdAt: new Date(),
    }

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    const mockUserFrom = vi.fn().mockReturnThis()
    const mockUserWhere = vi.fn().mockReturnThis()
    const mockUserLimit = vi.fn().mockResolvedValue([mockAdminUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockUserFrom,
    } as any)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as any)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as any)

    const request = new Request('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-admin-token' },
      body: JSON.stringify({
        // Missing required fields
        title: '',
        files: [],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should create task with questions', async () => {
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
      title: 'Test Task with Questions',
      description: null,
      deadline: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
    }

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })

    const mockUserFrom = vi.fn().mockReturnThis()
    const mockUserWhere = vi.fn().mockReturnThis()
    const mockUserLimit = vi.fn().mockResolvedValue([mockAdminUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockUserFrom,
    } as any)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as any)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as any)

    const mockTaskInsertValues = vi.fn().mockReturnThis()
    const mockTaskInsertReturning = vi.fn().mockResolvedValue([mockTask])

    vi.mocked(db.insert).mockReturnValue({
      values: mockTaskInsertValues,
    } as any)

    mockTaskInsertValues.mockReturnValue({
      returning: mockTaskInsertReturning,
    } as any)

    const request = new Request('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { cookie: 'session-token=valid-admin-token' },
      body: JSON.stringify({
        title: 'Test Task with Questions',
        assignedUserIds: ['user-1'],
        files: [{ title: 'Test', fileType: 'pdf', fileUrl: 'https://example.com/file.pdf', fileSize: 1024 }],
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
          },
        ],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.task).toBeDefined()
  })
})
