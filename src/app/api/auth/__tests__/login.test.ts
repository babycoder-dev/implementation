import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../login/route'
import { db } from '@/db'
import { users } from '@/db/schema'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock password verification
vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}))

// Mock session creation
vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn().mockResolvedValue('mock-jwt-token'),
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should login with valid credentials', async () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      passwordHash: '$2a$10$hashedpassword',
      name: 'Test User',
      role: 'user',
    }

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([mockUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)

    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)

    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    const { verifyPassword } = await import('@/lib/auth/password')
    vi.mocked(verifyPassword).mockResolvedValue(true)

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'Test123',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.token).toBeDefined()
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe(mockUser.id)
    expect(data.user.username).toBe(mockUser.username)
    expect(data.user.name).toBe(mockUser.name)
    expect(data.user.role).toBe(mockUser.role)
  })

  it('should return error for invalid credentials', async () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      passwordHash: '$2a$10$hashedpassword',
      name: 'Test User',
      role: 'user',
    }

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([mockUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)

    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)

    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    const { verifyPassword } = await import('@/lib/auth/password')
    vi.mocked(verifyPassword).mockResolvedValue(false)

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'WrongPassword',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('用户名或密码错误')
  })

  it('should return error for non-existent username', async () => {
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

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'nonexistent',
        password: 'Test123',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('用户名或密码错误')
  })

  it('should return error for empty username', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: '',
        password: 'Test123',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('用户名不能为空')
  })

  it('should return error for empty password', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: '',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('密码不能为空')
  })
})
