import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Use vi.hoisted to ensure mockSend is created before mocks are hoisted
const { mockSend } = vi.hoisted(() => {
  return {
    mockSend: vi.fn(),
  }
})

// Mock S3Client before importing the route
vi.mock('@aws-sdk/client-s3', async () => {
  return {
    S3Client: class MockS3Client {
      send = mockSend
    },
    DeleteObjectCommand: class MockDeleteObjectCommand {
      constructor(public params: unknown) {}
    },
    HeadObjectCommand: class MockHeadObjectCommand {
      constructor(public params: unknown) {}
    },
  }
})

// Now import the route
import { DELETE } from '../route'
import { db } from '@/db'

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

describe('DELETE /api/upload/:key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow admin to delete file (204)', async () => {
    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
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
    } as unknown)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as unknown)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as unknown)

    // Mock S3 operations
    mockSend
      .mockResolvedValueOnce({}) // HeadObjectCommand succeeds
      .mockResolvedValueOnce({}) // DeleteObjectCommand succeeds

    const request = new Request('http://localhost:3000/api/upload/tasks%2Ftask-1%2Ffile.pdf', {
      method: 'DELETE',
      headers: { cookie: 'session-token=valid-admin-token' },
    }) as unknown as NextRequest

    const response = await DELETE(request, { params: Promise.resolve({ key: 'tasks%2Ftask-1%2Ffile.pdf' }) })

    expect(response.status).toBe(204)
  })

  it('should return 403 for non-admin user', async () => {
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
    } as unknown)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as unknown)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as unknown)

    const request = new Request('http://localhost:3000/api/upload/tasks%2Ftask-1%2Ffile.pdf', {
      method: 'DELETE',
      headers: { cookie: 'session-token=valid-user-token' },
    }) as unknown as NextRequest

    const response = await DELETE(request, { params: Promise.resolve({ key: 'tasks%2Ftask-1%2Ffile.pdf' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('需要管理员权限')
  })

  it('should return 404 if file not found', async () => {
    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
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
    } as unknown)

    mockUserFrom.mockReturnValue({
      where: mockUserWhere,
    } as unknown)

    mockUserWhere.mockReturnValue({
      limit: mockUserLimit,
    } as unknown)

    // Mock HeadObjectCommand to throw (file not found)
    const notFoundError = new Error('NotFound')
    notFoundError.name = 'NotFound'
    mockSend.mockRejectedValueOnce(notFoundError)

    const request = new Request('http://localhost:3000/api/upload/nonexistent-file.pdf', {
      method: 'DELETE',
      headers: { cookie: 'session-token=valid-admin-token' },
    }) as unknown as NextRequest

    const response = await DELETE(request, { params: Promise.resolve({ key: 'nonexistent-file.pdf' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('文件不存在')
  })

  it('should return 401 when no session', async () => {
    // Mock validateRequest to return null
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/upload/tasks%2Ftask-1%2Ffile.pdf', {
      method: 'DELETE',
    }) as unknown as NextRequest

    const response = await DELETE(request, { params: Promise.resolve({ key: 'tasks%2Ftask-1%2Ffile.pdf' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })
})
