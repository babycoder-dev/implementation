import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import TaskList from '../TaskList'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

const mockTasks = [
  { id: '1', title: 'Task 1', status: 'pending', createdAt: new Date() },
  { id: '2', title: 'Task 2', status: 'completed', createdAt: new Date() }
]

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: mockTasks })
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TaskList', () => {
  it('displays loading state', () => {
    render(<TaskList />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('displays task list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockTasks })
    }))

    render(<TaskList />)
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
  })

  it('displays empty state when no tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    }))

    render(<TaskList />)
    await waitFor(() => {
      expect(screen.getByText('暂无任务')).toBeInTheDocument()
    })
  })

  it('shows create task button', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    }))

    render(<TaskList />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /创建任务/ })).toBeInTheDocument()
    })
  })

  it('shows edit button for each task', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: '1', title: 'Task 1', status: 'pending', createdAt: new Date() }] })
    }))

    render(<TaskList />)
    await waitFor(() => {
      const editLink = document.querySelector('a[href="/admin/tasks/1/edit"]')
      expect(editLink).toBeInTheDocument()
    })
  })
})
