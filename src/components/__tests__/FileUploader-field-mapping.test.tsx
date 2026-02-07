import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { FileUploader, UploadedFile } from '../FileUploader'

describe('FileUploader Field Mapping', () => {
  let mockFilesChange: vi.Mock
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    mockFilesChange = vi.fn()
    originalFetch = global.fetch
    // Mock fetch for file upload
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        url: 'https://example.com/files/test.pdf',
        path: '/uploads/test.pdf',
        size: 1024,
      }),
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('UploadedFile interface', () => {
    it('should have correct field names matching createTaskSchema', () => {
      // This test verifies the interface matches createTaskSchema
      const testFile: UploadedFile = {
        title: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
        fileSize: 1024,
        fileType: 'pdf',
      }

      // Should have title instead of name
      expect(testFile).toHaveProperty('title')
      expect(testFile.title).toBe('test.pdf')

      // Should have fileUrl instead of url
      expect(testFile).toHaveProperty('fileUrl')
      expect(testFile.fileUrl).toBe('https://example.com/test.pdf')

      // Should have fileSize instead of size
      expect(testFile).toHaveProperty('fileSize')
      expect(testFile.fileSize).toBe(1024)

      // Should have fileType
      expect(testFile).toHaveProperty('fileType')
      expect(testFile.fileType).toBe('pdf')

      // Should NOT have old field names
      expect(testFile).not.toHaveProperty('name')
      expect(testFile).not.toHaveProperty('url')
      expect(testFile).not.toHaveProperty('size')
    })

    it('should accept all valid fileType values', () => {
      const validTypes: Array<'pdf' | 'docx' | 'xlsx' | 'pptx' | 'video' | 'other'> = [
        'pdf',
        'docx',
        'xlsx',
        'pptx',
        'video',
        'other',
      ]

      validTypes.forEach((type) => {
        const file: UploadedFile = {
          title: `test.${type === 'other' ? 'xyz' : type}`,
          fileUrl: 'https://example.com/test',
          fileSize: 1000,
          fileType: type,
        }
        expect(file.fileType).toBe(type)
      })
    })
  })

  describe('FileUploader component', () => {
    it('should call onFilesChange with correct field names after upload', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      render(<FileUploader onFilesChange={mockFilesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })
      fireEvent.change(fileInput)

      // Wait for upload to complete
      await waitFor(() => {
        expect(mockFilesChange).toHaveBeenCalled()
      })

      // Get the files passed to onFilesChange
      const calledWith = mockFilesChange.mock.calls[0][0] as UploadedFile[]
      expect(calledWith.length).toBe(1)

      const uploadedFile = calledWith[0]

      // Should have 'title' instead of 'name'
      expect(uploadedFile).toHaveProperty('title')
      expect(uploadedFile.title).toBe('test.pdf')

      // Should have 'fileUrl' instead of 'url'
      expect(uploadedFile).toHaveProperty('fileUrl')
      expect(uploadedFile.fileUrl).toBe('https://example.com/files/test.pdf')

      // Should have 'fileSize' instead of 'size'
      expect(uploadedFile).toHaveProperty('fileSize')
      expect(uploadedFile.fileSize).toBe(1024)

      // Should have 'fileType'
      expect(uploadedFile).toHaveProperty('fileType')
      expect(uploadedFile.fileType).toBe('pdf')

      // Should NOT have old field names
      expect(uploadedFile).not.toHaveProperty('name')
      expect(uploadedFile).not.toHaveProperty('url')
      expect(uploadedFile).not.toHaveProperty('size')
    })

    it('should correctly detect fileType from extension', async () => {
      const mockFile = new File(['content'], 'document.docx', { type: 'application/octet-stream' })

      render(<FileUploader onFilesChange={mockFilesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(mockFilesChange).toHaveBeenCalled()
      })

      const calledWith = mockFilesChange.mock.calls[0][0] as UploadedFile[]
      expect(calledWith[0].fileType).toBe('docx')
    })
  })
})
