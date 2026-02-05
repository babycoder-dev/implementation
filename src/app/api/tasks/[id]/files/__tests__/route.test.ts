import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../route'
import { db } from '@/db'
import { tasks, taskFiles } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { uploadFile, getFileUrl } from '@/lib/storage/minio'
import { eq } from 'drizzle-orm'

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/storage/minio', () => ({
  uploadFile: vi.fn(),
  getFileUrl: vi.fn(),
}))

function createMockTask(overrides = {}) {
  return {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    createdBy: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date(),
    ...overrides,
  }
}

function createMockTaskFile(overrides = {}) {
  return {
    id: 'file-123',
    taskId: 'task-123',
    title: 'Test File',
    fileUrl: 'http://minio:9000/bucket/test-file.pdf',
    fileType: 'pdf',
    fileSize: 1024,
    order: 0,
    ...overrides,
  }
}

function setupDbSelectMock(mockTasks = [createMockTask()]) {
  const mockFrom = vi.fn().mockReturnThis()
  const mockWhere = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockResolvedValue(mockTasks)

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

function setupDbInsertMock(mockFile = createMockTaskFile()) {
  const mockInsertValues = vi.fn().mockReturnThis()
  const mockInsertReturning = vi.fn().mockResolvedValue([mockFile])

  vi.mocked(db.insert).mockReturnValue({
    values: mockInsertValues,
  } as any)

  mockInsertValues.mockReturnValue({
    returning: mockInsertReturning,
  } as any)
}

function createMockFileUpload(name = 'test.pdf', type = 'application/pdf', size = 1024) {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('POST /api/tasks/[id]/files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated request', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('未授权')
  })

  it('should return 403 for non-admin user who is not the owner', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'other-user-id',
      role: 'user',
    })
    setupDbSelectMock([createMockTask()])

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('需要管理员权限')
  })

  it('should upload a file to a task as owner', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'user',
    })
    setupDbSelectMock([createMockTask()])
    setupDbInsertMock()

    vi.mocked(uploadFile).mockResolvedValue({
      url: 'http://minio:9000/bucket/test-file.pdf',
      size: 1024,
      path: 'tasks/task-123/test-file.pdf',
    })
    vi.mocked(getFileUrl).mockReturnValue('http://minio:9000/bucket/tasks/task-123/test-file.pdf')

    const formData = new FormData()
    formData.append('file', createMockFileUpload('test.pdf', 'application/pdf', 1024))
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/task-123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: 'task-123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.file).toBeDefined()
    expect(data.file.id).toBeDefined()
    expect(data.file.url).toBeDefined()
    expect(data.file.size).toBeDefined()
  })

  it('should upload a file as admin user', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    setupDbSelectMock([createMockTask()])
    setupDbInsertMock()

    vi.mocked(uploadFile).mockResolvedValue({
      url: 'http://minio:9000/bucket/test-file.pdf',
      size: 1024,
      path: 'tasks/task-123/test-file.pdf',
    })
    vi.mocked(getFileUrl).mockReturnValue('http://minio:9000/bucket/tasks/task-123/test-file.pdf')

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/task-123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: 'task-123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
  })

  it('should return 404 for non-existent task', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    // Return empty for task lookup
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([])
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any)
    mockFrom.mockReturnValue({ where: mockWhere } as any)
    mockWhere.mockReturnValue({ limit: mockLimit } as any)

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/nonexistent/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: 'nonexistent' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('任务不存在')
  })

  it('should return error for missing file', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    setupDbSelectMock([createMockTask()])

    const formData = new FormData()
    formData.append('title', 'Test File')
    // No file appended

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('请选择要上传的文件')
  })

  it('should return error for missing title', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    setupDbSelectMock([createMockTask()])

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    // No title appended

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('请输入文件标题')
  })

  it('should handle various file types', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    setupDbSelectMock([createMockTask()])
    setupDbInsertMock(createMockTaskFile({ fileType: 'docx' }))

    vi.mocked(uploadFile).mockResolvedValue({
      url: 'http://minio:9000/bucket/test.docx',
      size: 5120,
      path: 'tasks/task-123/test.docx',
    })
    vi.mocked(getFileUrl).mockReturnValue('http://minio:9000/bucket/tasks/task-123/test.docx')

    const formData = new FormData()
    const file = new File(['content'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    Object.defineProperty(file, 'size', { value: 5120 })
    formData.append('file', file)
    formData.append('title', 'Word Document')

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
  })

  it('should return error when upload fails', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    setupDbSelectMock([createMockTask()])

    vi.mocked(uploadFile).mockRejectedValue(new Error('文件上传失败'))

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('文件上传失败')
  })

  it('should handle database errors gracefully', async () => {
    vi.mocked(validateRequest).mockResolvedValue({
      userId: 'admin-id',
      role: 'admin',
    })
    setupDbSelectMock([createMockTask()])

    vi.mocked(uploadFile).mockResolvedValue({
      url: 'http://minio:9000/bucket/test.pdf',
      size: 1024,
      path: 'tasks/task-123/test.pdf',
    })
    vi.mocked(getFileUrl).mockReturnValue('http://minio:9000/bucket/tasks/task-123/test.pdf')

    vi.mocked(db.insert).mockImplementation(() => {
      throw new Error('Database error')
    })

    const formData = new FormData()
    formData.append('file', createMockFileUpload())
    formData.append('title', 'Test File')

    const request = new Request('http://localhost:3000/api/tasks/123/files', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: '123' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('保存文件信息失败')
  })
})
