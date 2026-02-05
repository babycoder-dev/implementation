import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as nextNavigation from 'next/navigation'
import CreateUserPage from '../page'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}))

describe('CreateUserPage', () => {
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
    vi.spyOn(nextNavigation, 'usePathname').mockReturnValue('/admin/users/create')
  })

  it('renders page with title', () => {
    render(<CreateUserPage />)
    expect(screen.getByRole('heading', { level: 3, name: '创建用户' })).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(<CreateUserPage />)
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入姓名')).toBeInTheDocument()
  })

  it('shows validation errors for empty username', async () => {
    render(<CreateUserPage />)

    const usernameInput = screen.getByPlaceholderText('请输入用户名')
    fireEvent.blur(usernameInput)

    // Username is required
    expect(usernameInput).toBeRequired()
  })

  it('shows validation errors for empty password', async () => {
    render(<CreateUserPage />)

    const passwordInput = screen.getByPlaceholderText('请输入密码')
    fireEvent.blur(passwordInput)

    // Password is required
    expect(passwordInput).toBeRequired()
  })

  it('calls API on submit with correct data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: '1' } })
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<CreateUserPage />)

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: 'Test User' } })

    const roleSelect = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(roleSelect, { target: { value: 'admin' } })

    // Get submit button by exact text
    const submitButton = screen.getByRole('button', { name: '创建用户' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123',
          name: 'Test User',
          role: 'admin',
        }),
      }))
    })
  })

  it('disables submit button during loading', async () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    vi.stubGlobal('fetch', mockFetch)

    render(<CreateUserPage />)

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } })

    const submitButton = screen.getByRole('button', { name: '创建用户' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('shows error message on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: '用户名已存在' })
    }))

    render(<CreateUserPage />)

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'existinguser' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '创建用户' }))

    await waitFor(() => {
      expect(screen.getByText('用户名已存在')).toBeInTheDocument()
    })
  })

  it('shows network error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    render(<CreateUserPage />)

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '创建用户' }))

    await waitFor(() => {
      expect(screen.getByText('网络错误，请重试')).toBeInTheDocument()
    })
  })

  it('has back link to user list', () => {
    render(<CreateUserPage />)

    const backLink = screen.getByRole('link', { name: /返回用户列表/ })
    expect(backLink).toHaveAttribute('href', '/admin/users')
  })

  it('has cancel button', () => {
    render(<CreateUserPage />)

    const cancelButton = screen.getByRole('button', { name: '取消' })
    expect(cancelButton).toBeInTheDocument()
  })

  it('navigates to user list on successful creation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: '1' } })
    }))

    render(<CreateUserPage />)

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '创建用户' }))

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/users')
    })
  })

  it('shows role options correctly', () => {
    render(<CreateUserPage />)

    const roleSelect = screen.getByRole('combobox') as HTMLSelectElement
    expect(roleSelect).toBeInTheDocument()
    fireEvent.change(roleSelect, { target: { value: 'admin' } })
    expect(roleSelect.value).toBe('admin')
  })

  it('disables all form fields during loading', async () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    vi.stubGlobal('fetch', mockFetch)

    render(<CreateUserPage />)

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } })

    const submitButton = screen.getByRole('button', { name: '创建用户' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeDisabled()
      expect(screen.getByPlaceholderText('请输入密码')).toBeDisabled()
      expect(screen.getByPlaceholderText('请输入姓名')).toBeDisabled()
      expect(screen.getByRole('combobox')).toBeDisabled()
      expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    })
  })
})
