import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { db } from '@/db'
import type { NextRequest } from 'next/server'

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock session validation
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
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
  } as unknown)

  mockFrom.mockReturnValue({
    where: mockWhere,
  } as unknown)

  mockWhere.mockReturnValue({
    limit: mockLimit,
  } as unknown)
}

function setupEmptyDbMock() {
  const mockFrom = vi.fn().mockReturnThis()
  const mockWhere = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockResolvedValue([])

  vi.mocked(db.select).mockReturnValue({
    from: mockFrom,
  } as unknown)

  mockFrom.mockReturnValue({
    where: mockWhere,
  } as unknown)

  mockWhere.mockReturnValue({
    limit: mockLimit,
  } as unknown)
}

describe('GET /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user info for authenticated user', async () => {
    const mockUser = createMockUser()
    setupDbMock(mockUser)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: mockUser.id })

    const request = new Request('http://localhost:3000/api/users/me', {
      headers: { cookie: 'session-token=valid-token' },
    }) as unknown as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe(mockUser.id)
    expect(data.user.username).toBe(mockUser.username)
    expect(data.user.name).toBe(mockUser.name)
    expect(data.user.role).toBe(mockUser.role)
  })

  it('should return 401 when no valid session', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/users/me', {
      headers: { cookie: 'session-token=invalid-token' },
    }) as unknown as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('should return 401 when no session token', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/users/me') as unknown as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('should return 404 when user not found', async () => {
    setupEmptyDbMock()

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: 'non-existent-id' })

    const request = new Request('http://localhost:3000/api/users/me', {
      headers: { cookie: 'session-token=valid-token' },
    }) as unknown as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('用户不存在')
  })

  it('should return admin user info', async () => {
    const mockAdmin = createMockUser({
      id: 'admin-id',
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
    })
    setupDbMock(mockAdmin)

    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue({ userId: mockAdmin.id })

    const request = new Request('http://localhost:3000/api/users/me', {
      headers: { cookie: 'session-token=valid-admin-token' },
    }) as unknown as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.id).toBe(mockAdmin.id)
    expect(data.user.username).toBe(mockAdmin.username)
    expect(data.user.name).toBe(mockAdmin.name)
    expect(data.user.role).toBe('admin')
  })
})
