import { describe, it, expect, vi } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
        })),
      })),
    })),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', name: 'name', departmentId: 'departmentId' },
  departments: { id: 'id', name: 'name' },
  taskAssignments: { id: 'id', userId: 'userId' },
  quizSubmissions: { id: 'id', userId: 'userId', taskId: 'taskId', passed: 'passed', score: 'score' },
  learningLogs: { id: 'id', userId: 'userId', duration: 'duration' },
  videoProgress: { id: 'id', userId: 'userId', currentTime: 'currentTime' },
  tasks: { id: 'id' },
}))

describe('GET /api/reports/users', () => {
  it('未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/reports/users')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('非管理员应返回403', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'user-id' })
    const request = new NextRequest('http://localhost/api/reports/users')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('管理员应返回200', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'admin-id' })
    const request = new NextRequest('http://localhost/api/reports/users')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
