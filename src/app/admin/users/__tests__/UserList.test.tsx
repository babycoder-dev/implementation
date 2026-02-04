import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import UserList from '../UserList'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

const mockUsers = [
  { id: '1', username: 'admin', name: '管理员', role: 'admin', createdAt: new Date() },
  { id: '2', username: 'user1', name: '用户一', role: 'user', createdAt: new Date() }
]

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: mockUsers })
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UserList', () => {
  it('displays loading state', () => {
    render(<UserList />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('displays user list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockUsers })
    }))

    render(<UserList />)
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })
  })

  it('displays empty state when no users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    }))

    render(<UserList />)
    await waitFor(() => {
      expect(screen.getByText('暂无用户')).toBeInTheDocument()
    })
  })

  it('shows create user button', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    }))

    render(<UserList />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创建用户/ })).toBeInTheDocument()
    })
  })

  it('shows edit button for each user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockUsers })
    }))

    render(<UserList />)
    await waitFor(() => {
      // Edit button has Edit icon, check by SVG class
      const editButtons = document.querySelectorAll('button svg.lucide-square-pen')
      expect(editButtons.length).toBe(2)
    })
  })
})
