import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFile, getFileUrl } from '../minio'

// Mock fetch globally
global.fetch = vi.fn()

describe('MinIO Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadFile', () => {
    it('should upload a file', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockResponse = {
        url: 'http://localhost:9000/bucket/tasks/task-1/file-1.pdf',
        size: mockFile.size,
        path: 'tasks/task-1/file-1.pdf',
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await uploadFile(mockFile, 'tasks/task-1', 'file-1.pdf')

      expect(result).toBeDefined()
      expect(result.url).toBeDefined()
      expect(result.size).toBe(mockFile.size)
    })
  })

  describe('getFileUrl', () => {
    it('should return a file URL', () => {
      const url = getFileUrl('tasks/task-1/file-1.pdf')

      expect(url).toContain('tasks/task-1/file-1.pdf')
    })
  })
})
