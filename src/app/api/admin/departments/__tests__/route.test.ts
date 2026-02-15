import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { PUT, DELETE } from '../[id]/route'
import { NextRequest } from 'next/server'

// Mock validateRequest
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

// Mock db
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
        leftJoin: vi.fn(() => ({
          groupBy: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}))

vi.mock('@/db/schema', () => ({
  departments: {
    id: 'id',
    name: 'name',
    description: 'description',
    createdAt: 'createdAt',
  },
  users: {
    id: 'id',
    role: 'role',
    departmentId: 'departmentId',
  },
}))

const mockAdmin = { userId: 'admin-id' }
const mockUser = { userId: 'user-id' }

describe('GET /api/admin/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/departments')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('非管理员应返回403', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(mockUser)
    const request = new NextRequest('http://localhost/api/admin/departments')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('管理员应返回200', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(mockAdmin)
    const request = new NextRequest('http://localhost/api/admin/departments')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

describe('POST /api/admin/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未授权应返回401', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '技术部' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('创建部门应返回201', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(mockAdmin)
    const request = new NextRequest('http://localhost/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '技术部' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

describe('PUT /api/admin/departments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('更新部门应返回200', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(mockAdmin)
    const request = new NextRequest('http://localhost/api/admin/departments/1', {
      method: 'PUT',
      body: JSON.stringify({ name: '研发部' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(200)
  })
})

describe('DELETE /api/admin/departments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('删除部门应返回200', async () => {
    const { validateRequest } = await import('@/lib/auth/middleware')
    vi.mocked(validateRequest).mockResolvedValue(mockAdmin)
    const request = new NextRequest('http://localhost/api/admin/departments/1', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(200)
  })
})
