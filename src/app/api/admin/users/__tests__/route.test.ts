import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../route'
import { clearAllRateLimits } from '@/lib/rate-limit'

describe('POST /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllRateLimits()
  })

  it('should return 401 for unauthenticated request', async () => {
    const request = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        // No cookie header
      },
      body: JSON.stringify({
        username: 'newuser',
        password: 'Test12345',
        name: 'New User',
        role: 'user',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 401 for invalid session token', async () => {
    const request = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        cookie: 'session-token=invalid-token',
      },
      body: JSON.stringify({
        username: 'newuser',
        password: 'Test12345',
        name: 'New User',
        role: 'user',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 400 for missing required fields', async () => {
    const request = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        cookie: 'session-token=invalid-token',
      },
      body: JSON.stringify({
        username: 'newuser',
        // missing password and name
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(data.success).toBe(false)
  })
})
