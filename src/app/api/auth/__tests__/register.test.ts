import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../register/route'
import { db } from '@/db'
import { users } from '@/db/schema'

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

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register a new user', async () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      name: 'Test User',
      role: 'user',
    }

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

    const mockInsertValues = vi.fn().mockReturnThis()
    const mockInsertReturning = vi.fn().mockResolvedValue([mockUser])

    vi.mocked(db.insert).mockReturnValue({
      values: mockInsertValues,
    } as any)

    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
    } as any)

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
    const mockExistingUser = {
      id: 'existing-id',
      username: 'existing',
      passwordHash: 'hash',
      name: 'Existing User',
      role: 'user',
    }

    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([mockExistingUser])

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)

    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)

    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

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
})
