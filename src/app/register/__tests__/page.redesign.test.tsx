import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import RegisterPage from '../page'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('Register Page Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockReset()
  })

  describe('Layout & Structure', () => {
    it('renders centered card layout with brand header', () => {
      render(<RegisterPage />)

      // Should have brand title
      expect(screen.getByText('企业学习管理系统')).toBeInTheDocument()
    })

    it('displays page subtitle', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/创建您的账号/i)).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('renders username field', () => {
      render(<RegisterPage />)

      expect(screen.getByPlaceholderText(/请输入用户名/i)).toBeInTheDocument()
    })

    it('renders name field', () => {
      render(<RegisterPage />)

      expect(screen.getByPlaceholderText(/请输入您的姓名/i)).toBeInTheDocument()
    })

    it('renders password field', () => {
      render(<RegisterPage />)

      expect(screen.getByPlaceholderText(/请输入密码/i)).toBeInTheDocument()
    })

    it('renders confirm password field', () => {
      render(<RegisterPage />)

      expect(screen.getByPlaceholderText(/请再次输入密码/i)).toBeInTheDocument()
    })

    it('renders role selector with learner option', () => {
      render(<RegisterPage />)

      expect(screen.getByRole('radio', { name: /学习者/i })).toBeInTheDocument()
    })

    it('renders role selector with admin option', () => {
      render(<RegisterPage />)

      expect(screen.getByRole('radio', { name: /管理员/i })).toBeInTheDocument()
    })

    it('renders role selector with teacher option', () => {
      render(<RegisterPage />)

      expect(screen.getByRole('radio', { name: /教师/i })).toBeInTheDocument()
    })
  })

  describe('Primary Button', () => {
    it('renders register button', () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /注册/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('shows loading state during submission', async () => {
      ;(fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<RegisterPage />)

      fireEvent.change(screen.getByPlaceholderText(/请输入用户名/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByPlaceholderText(/请输入您的姓名/i), { target: { value: '测试用户' } })
      fireEvent.change(screen.getByPlaceholderText(/请输入密码/i), { target: { value: 'password123' } })
      fireEvent.change(screen.getByPlaceholderText(/请再次输入密码/i), { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /注册/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /注册中/i })).toBeInTheDocument()
      })
    })

    it('is disabled during submission', async () => {
      ;(fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<RegisterPage />)

      fireEvent.change(screen.getByPlaceholderText(/请输入用户名/i), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByPlaceholderText(/请输入您的姓名/i), { target: { value: '测试用户' } })
      fireEvent.change(screen.getByPlaceholderText(/请输入密码/i), { target: { value: 'password123' } })
      fireEvent.change(screen.getByPlaceholderText(/请再次输入密码/i), { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /注册/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /注册/i })).toBeDisabled()
      })
    })
  })

  describe('Navigation Links', () => {
    it('renders login link for existing users', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/已有账号/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /立即登录/i })).toBeInTheDocument()
    })

    it('login link navigates to login page', () => {
      render(<RegisterPage />)

      const loginLink = screen.getByRole('link', { name: /立即登录/i })
      expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Form Submission', () => {
    it('submits form with all required fields', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<RegisterPage />)

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i)
      const nameInput = screen.getByPlaceholderText(/请输入您的姓名/i)
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i)
      const confirmPasswordInput = screen.getByPlaceholderText(/请再次输入密码/i)
      const submitButton = screen.getByRole('button', { name: /注册/i })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(nameInput, { target: { value: '测试用户' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }))
      })
    })

    it('redirects to login on successful registration', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<RegisterPage />)

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i)
      const nameInput = screen.getByPlaceholderText(/请输入您的姓名/i)
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i)
      const confirmPasswordInput = screen.getByPlaceholderText(/请再次输入密码/i)
      const submitButton = screen.getByRole('button', { name: /注册/i })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(nameInput, { target: { value: '测试用户' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?registered=true')
      })
    })

    it('displays error message on failed registration', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: '用户名已存在' }),
      })

      render(<RegisterPage />)

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i)
      const nameInput = screen.getByPlaceholderText(/请输入您的姓名/i)
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i)
      const confirmPasswordInput = screen.getByPlaceholderText(/请再次输入密码/i)
      const submitButton = screen.getByRole('button', { name: /注册/i })

      fireEvent.change(usernameInput, { target: { value: 'existinguser' } })
      fireEvent.change(nameInput, { target: { value: '测试用户' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/用户名已存在/i)).toBeInTheDocument()
      })
    })

    it('validates password confirmation mismatch', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<RegisterPage />)

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i)
      const nameInput = screen.getByPlaceholderText(/请输入您的姓名/i)
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i)
      const confirmPasswordInput = screen.getByPlaceholderText(/请再次输入密码/i)
      const submitButton = screen.getByRole('button', { name: /注册/i })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(nameInput, { target: { value: '测试用户' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/两次输入的密码不一致/i)).toBeInTheDocument()
      })
    })
  })

  describe('Role Selection', () => {
    it('defaults to learner role', () => {
      render(<RegisterPage />)

      const learnerOption = screen.getByRole('radio', { name: /学习者/i })
      expect(learnerOption).toBeChecked()
    })

    it('allows selecting admin role', () => {
      render(<RegisterPage />)

      const adminOption = screen.getByRole('radio', { name: /管理员/i })
      fireEvent.click(adminOption)

      expect(adminOption).toBeChecked()
    })

    it('allows selecting teacher role', () => {
      render(<RegisterPage />)

      const teacherOption = screen.getByRole('radio', { name: /教师/i })
      fireEvent.click(teacherOption)

      expect(teacherOption).toBeChecked()
    })
  })
})
