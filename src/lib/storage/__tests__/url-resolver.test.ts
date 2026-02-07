import { describe, it, expect } from 'vitest'
import { getPublicFileUrl, getInternalFileUrl } from '../url-resolver'

describe('URL Resolver', () => {
  describe('getPublicFileUrl', () => {
    it('should convert internal URL to public URL', () => {
      const internalUrl = 'http://minio:9000/bucket/tasks/file.pdf'
      const publicUrl = getPublicFileUrl(internalUrl)

      expect(publicUrl).toBe('http://localhost:9000/bucket/tasks/file.pdf')
    })

    it('should handle https URLs with minio endpoint', () => {
      const internalUrl = 'https://minio:9000/bucket/tasks/file.pdf'
      const publicUrl = getPublicFileUrl(internalUrl)

      expect(publicUrl).toBe('https://localhost:9000/bucket/tasks/file.pdf')
    })

    it('should leave public URL unchanged', () => {
      const publicUrl = 'http://localhost:9000/bucket/tasks/file.pdf'
      const result = getPublicFileUrl(publicUrl)

      expect(result).toBe(publicUrl)
    })
  })

  describe('getInternalFileUrl', () => {
    it('should convert public URL to internal URL', () => {
      const publicUrl = 'http://localhost:9000/bucket/tasks/file.pdf'
      const internalUrl = getInternalFileUrl(publicUrl)

      expect(internalUrl).toBe('http://minio:9000/bucket/tasks/file.pdf')
    })

    it('should leave internal URL unchanged', () => {
      const internalUrl = 'http://minio:9000/bucket/tasks/file.pdf'
      const result = getInternalFileUrl(internalUrl)

      expect(result).toBe(internalUrl)
    })
  })
})
