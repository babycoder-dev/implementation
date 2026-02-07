import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
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

describe('POST /api/quiz/questions - Admin Permission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow admin to create questions for any task', async () => {
    const mockTaskId = '660e8400-e29b-41d4-a716-446655440000'

    const mockTask = {
      id: mockTaskId,
      title: 'Test Task',
      description: 'Test Description',
      deadline: null,
      createdBy: 'admin-123',
      createdAt: new Date(),
    }

    const mockAdminUser = {
      id: 'admin-user-id',
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
    }

    const mockNewQuestion = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      taskId: mockTaskId,
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
    }

    // Build mock chain for select
    const createSelectMock = (result: any) => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(result)
      mockFrom.mockReturnValue({ where: mockWhere } as any)
      mockWhere.mockReturnValue({ limit: mockLimit } as any)
      return { from: mockFrom }
    }

    // Mock select - task exists first, then user role check (admin)
    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) {
        // Task exists check
        return createSelectMock([mockTask])
      }
      // User role check - admin, skips assignment check
      return createSelectMock([mockAdminUser])
    })

    // Mock insert for creating question
    const mockInsertValues = vi.fn().mockReturnThis()
    const mockInsertReturning = vi.fn().mockResolvedValue([mockNewQuestion])
    vi.mocked(db.insert).mockReturnValue({
      values: mockInsertValues,
    } as any)
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
    } as any)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-user-id' })

    const request = new Request(
      'http://localhost:3000/api/quiz/questions',
      {
        method: 'POST',
        headers: {
          cookie: 'session-token=valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: mockTaskId,
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
        }),
      }
    )

    const response = await POST(request as any)
    const data = await response.json()

    // Admin should be able to create questions
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 403 for non-assigned non-admin user', async () => {
    const mockTaskId = '660e8400-e29b-41d4-a716-446655440000'

    const mockTask = {
      id: mockTaskId,
      title: 'Test Task',
      description: 'Test Description',
      deadline: null,
      createdBy: 'admin-123',
      createdAt: new Date(),
    }

    const mockRegularUser = {
      id: 'regular-user-id',
      username: 'user',
      name: 'Regular User',
      role: 'user',
      createdAt: new Date(),
    }

    // Build mock chain for select
    const createSelectMock = (result: any) => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(result)
      mockFrom.mockReturnValue({ where: mockWhere } as any)
      mockWhere.mockReturnValue({ limit: mockLimit } as any)
      return { from: mockFrom }
    }

    // Mock select - task exists first, then user role (regular), then no assignment
    let selectCallIndex = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) {
        // Task exists check
        return createSelectMock([mockTask])
      }
      if (selectCallIndex === 2) {
        // User role check - regular user
        return createSelectMock([mockRegularUser])
      }
      // No assignment - should return 403
      return createSelectMock([])
    })

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'regular-user-id' })

    const request = new Request(
      'http://localhost:3000/api/quiz/questions',
      {
        method: 'POST',
        headers: {
          cookie: 'session-token=valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: mockTaskId,
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
        }),
      }
    )

    const response = await POST(request as any)
    const data = await response.json()

    // Non-admin without assignment should get 403
    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('无权访问此任务')
  })
})
