import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../register/route'
import { db } from '@/db'
import { users } from '@/db/schema'
import { clearAllRateLimits } from '@/lib/rate-limit'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock password hashing
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
}))

function createMockUser(overrides = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    name: 'Test User',
    role: 'user',
    ...overrides,
  }
}

function setupDbMock(mockUser = createMockUser()) {
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
}

function setupEmptyDbMock() {
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
}

function setupDbInsertMock(mockUser = createMockUser()) {
  const mockInsertValues = vi.fn().mockReturnThis()
  const mockInsertReturning = vi.fn().mockResolvedValue([mockUser])

  vi.mocked(db.insert).mockReturnValue({
    values: mockInsertValues,
  } as any)

  mockInsertValues.mockReturnValue({
    returning: mockInsertReturning,
  } as any)
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllRateLimits()
  })

  it('should register a new user', async () => {
    const mockUser = createMockUser()
    setupEmptyDbMock()
    setupDbInsertMock(mockUser)

    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'Test123',
        name: 'Test User',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.user).toBeDefined()
    expect(data.user.username).toBe('testuser')
  })

  it('should return error for duplicate username', async () => {
    const mockExistingUser = createMockUser({
      id: 'existing-id',
      username: 'existing',
    })
    setupDbMock(mockExistingUser)

    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'existing',
        password: 'Test123',
        name: 'Test User',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('用户名已存在')
  })

  it('should return error for invalid username format', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'invalid username!',
        password: 'Test123',
        name: 'Test User',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('只能包含字母、数字和下划线')
  })

  it('should return error for short password', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: '12345',
        name: 'Test User',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('密码至少需要 6 个字符')
  })

  it('should return error for empty name', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'Test123',
        name: '',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('姓名不能为空')
  })

  describe('Rate limiting', () => {
    it('should allow requests within the rate limit', async () => {
      const mockUser = createMockUser()
      setupEmptyDbMock()
      setupDbInsertMock(mockUser)

      // Make 3 requests (at the limit)
      for (let i = 0; i < 3; i++) {
        clearAllRateLimits() // Clear between to avoid hitting limit
        const request = new Request('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username: `testuser${i}`,
            password: 'Test123',
            name: 'Test User',
          }),
        })
        const response = await POST(request as any)
        expect(response.status).toBe(201)
      }
    })

    it('should reject requests exceeding the rate limit', async () => {
      // Clear before making requests
      clearAllRateLimits()

      // Make 3 requests to reach the limit
      for (let i = 0; i < 3; i++) {
        const mockUser = createMockUser()
        setupEmptyDbMock()
        setupDbInsertMock(mockUser)

        const request = new Request('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username: `testuser${i}`,
            password: 'Test123',
            name: 'Test User',
          }),
        })
        await POST(request as any)
      }

      // 4th request should be rate limited
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser4',
          password: 'Test123',
          name: 'Test User',
        }),
      })
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toBe('注册请求过于频繁，请稍后再试')
      expect(data.retryAfter).toBeDefined()
    })

    it('should include rate limit headers', async () => {
      const mockUser = createMockUser()
      setupEmptyDbMock()
      setupDbInsertMock(mockUser)

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'Test123',
          name: 'Test User',
        }),
      })

      const response = await POST(request as any)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('3')
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })
})
