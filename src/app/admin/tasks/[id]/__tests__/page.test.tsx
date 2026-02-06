import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as nextNavigation from 'next/navigation'
import TaskDetailPage from '../page'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}))

describe('TaskDetailPage', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(nextNavigation, 'useRouter').mockReturnValue(mockRouter)
  })

  it('displays task title and description', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        task: {
          id: '1',
          title: 'Test Task',
          description: 'Test Description',
          deadline: null,
          createdAt: new Date().toISOString(),
        },
        files: [],
        assignedUsers: [],
      })
    }))

    render(<TaskDetailPage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeDefined()
    })
    expect(screen.getByText('Test Description')).toBeDefined()
  })

  it('displays deadline when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        task: {
          id: '1',
          title: 'Task with Deadline',
          description: '',
          deadline: '2025-12-31T23:59:59Z',
          createdAt: new Date().toISOString(),
        },
        files: [],
        assignedUsers: [],
      })
    }))

    render(<TaskDetailPage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('截止时间')).toBeDefined()
    })
  })

  it('displays files list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        task: {
          id: '1',
          title: 'Task with Files',
          description: '',
          deadline: null,
          createdAt: new Date().toISOString(),
        },
        files: [
          { id: 'f1', title: 'Document.pdf', fileUrl: 'http://example.com/file.pdf', fileType: 'pdf', fileSize: 1024, order: 0 },
        ],
        assignedUsers: [],
      })
    }))

    render(<TaskDetailPage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Document.pdf')).toBeDefined()
    })
  })

  it('displays assigned users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        task: {
          id: '1',
          title: 'Task with Users',
          description: '',
          deadline: null,
          createdAt: new Date().toISOString(),
        },
        files: [],
        assignedUsers: [
          { id: 'u1', name: 'John Doe', username: 'john' },
        ],
      })
    }))

    render(<TaskDetailPage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined()
    })
  })

  it('shows loading state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))

    render(<TaskDetailPage params={{ id: '1' }} />)

    expect(screen.getByText('加载中...')).toBeDefined()
  })

  it('shows error when task not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: '任务不存在',
      })
    }))

    render(<TaskDetailPage params={{ id: 'invalid' }} />)

    await waitFor(() => {
      expect(screen.getByText('任务不存在')).toBeDefined()
    })
  })
})
