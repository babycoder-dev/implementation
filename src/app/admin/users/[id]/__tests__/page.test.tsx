import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as nextNavigation from 'next/navigation'
import UserEditorPage from '../page'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  usePathname: vi.fn(),
}))

describe('UserEditorPage', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }

  const mockUser = {
    id: '123',
    username: 'testuser',
    name: 'Test User',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(nextNavigation, 'useRouter').mockReturnValue(mockRouter)
    vi.spyOn(nextNavigation, 'useParams').mockReturnValue({ id: '123' })
  })

  it('renders page with title', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUser })
    }))

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: '编辑用户' })).toBeInTheDocument()
    })
  })

  it('renders all form fields with user data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUser })
    }))

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))))

    render(<UserEditorPage params={{ id: '123' }} />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('shows error when user not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: '用户不存在' })
    }))

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText('用户不存在')).toBeInTheDocument()
    })
  })

  it('calls API on save with correct data', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUser })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
    vi.stubGlobal('fetch', mockFetch)

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Test User'), { target: { value: 'Updated User' } })

    const saveButton = screen.getByRole('button', { name: '保存更改' })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/123', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          name: 'Updated User',
          role: 'user',
        }),
      }))
    })
  })

  it('disables save button during saving', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUser })
      })
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    vi.stubGlobal('fetch', mockFetch)

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: '保存更改' })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })
  })

  it('shows error message on save failure', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUser })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: '更新失败' })
      })
    vi.stubGlobal('fetch', mockFetch)

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: '保存更改' })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('更新失败')).toBeInTheDocument()
    })
  })

  it('has reset password button', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUser })
    }))

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重置密码' })).toBeInTheDocument()
    })
  })

  it('has delete user button', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUser })
    }))

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '删除用户' })).toBeInTheDocument()
    })
  })

  it('has back link to user list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUser })
    }))

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      const backLink = screen.getByRole('link', { name: /返回用户列表/ })
      expect(backLink).toHaveAttribute('href', '/admin/users')
    })
  })

  it('can change user role', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockUser })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
    vi.stubGlobal('fetch', mockFetch)

    render(<UserEditorPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '保存更改' })).toBeInTheDocument()
    })

    const roleSelect = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(roleSelect, { target: { value: 'admin' } })

    const saveButton = screen.getByRole('button', { name: '保存更改' })
    fireEvent.click(saveButton)

    await waitFor(() => {
      const calls = mockFetch.mock.calls
      const saveCall = calls.find((call: unknown[]) => {
        const args = call[1] as { body?: string } | undefined
        return args?.body?.includes('"role":"admin"')
      })
      expect(saveCall).toBeDefined()
    })
  })
})
