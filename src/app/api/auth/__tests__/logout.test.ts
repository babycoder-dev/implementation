import { POST } from '../logout/route'
import { NextRequest, NextResponse } from 'next/server'

// Mock request
const mockRequest = {
  cookies: {
    get: (name: string) => {
      if (name === 'session-token') {
        return { value: 'valid-token' }
      }
      return undefined
    }
  }
} as unknown as NextRequest

describe('POST /api/auth/logout', () => {
  it('应该清除 session cookie 并返回成功', async () => {
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('应该在 cookie 中设置已过期的 session-token', async () => {
    const response = await POST(mockRequest)
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('session-token=')
    expect(setCookie).toContain('Max-Age=0')
  })
})
