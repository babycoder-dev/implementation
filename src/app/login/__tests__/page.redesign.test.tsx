import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import LoginPage from '../page'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('Login Page Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockReset()
  })

  describe('Layout & Structure', () => {
    it('renders centered card layout with brand header', () => {
      render(<LoginPage />)

      // Should have brand title
      expect(screen.getByText('企业学习管理系统')).toBeInTheDocument()
    })

    it('displays page subtitle', () => {
      render(<LoginPage />)

      expect(screen.getByText(/请登录您的账号/i)).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('renders username field with label', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument()
    })

    it('renders password field with label', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
    })
  })

  describe('Primary Button', () => {
    it('renders login button with primary color styling', () => {
      render(<LoginPage />)

      const submitButton = screen.getByRole('button', { name: /登录/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('shows loading state during submission', async () => {
      ;(fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<LoginPage />)

      const usernameInput = screen.getByLabelText(/用户名/i)
      const passwordInput = screen.getByLabelText(/密码/i)
      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /登录中/i })).toBeInTheDocument()
      })
    })

    it('is disabled during submission', async () => {
      ;(fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<LoginPage />)

      const usernameInput = screen.getByLabelText(/用户名/i)
      const passwordInput = screen.getByLabelText(/密码/i)
      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /登录/i })).toBeDisabled()
      })
    })
  })

  describe('Navigation Links', () => {
    it('renders forgot password link', () => {
      render(<LoginPage />)

      expect(screen.getByText(/忘记密码/i)).toBeInTheDocument()
    })

    it('renders register link for new users', () => {
      render(<LoginPage />)

      expect(screen.getByText(/没有账号/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /立即注册/i })).toBeInTheDocument()
    })

    it('forgot password link has proper href', () => {
      render(<LoginPage />)

      const forgotLink = screen.getByText(/忘记密码/i)
      expect(forgotLink.closest('a')).toHaveAttribute('href', '/forgot-password')
    })

    it('register link navigates to register page', () => {
      render(<LoginPage />)

      const registerLink = screen.getByRole('link', { name: /立即注册/i })
      expect(registerLink).toHaveAttribute('href', '/register')
    })
  })

  describe('Form Submission', () => {
    it('submits form with username and password', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, user: { role: 'student' } }),
      })

      render(<LoginPage />)

      const usernameInput = screen.getByLabelText(/用户名/i)
      const passwordInput = screen.getByLabelText(/密码/i)

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        }))
      })
    })

    it('redirects to dashboard on successful login', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, user: { role: 'student' } }),
      })

      render(<LoginPage />)

      const usernameInput = screen.getByLabelText(/用户名/i)
      const passwordInput = screen.getByLabelText(/密码/i)

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('redirects to admin on admin login', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, user: { role: 'admin' } }),
      })

      render(<LoginPage />)

      const usernameInput = screen.getByLabelText(/用户名/i)
      const passwordInput = screen.getByLabelText(/密码/i)

      fireEvent.change(usernameInput, { target: { value: 'admin' } })
      fireEvent.change(passwordInput, { target: { value: 'admin123' } })
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin')
      })
    })

    it('displays error message on failed login', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: '用户名或密码错误' }),
      })

      render(<LoginPage />)

      const usernameInput = screen.getByLabelText(/用户名/i)
      const passwordInput = screen.getByLabelText(/密码/i)

      fireEvent.change(usernameInput, { target: { value: 'wronguser' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))

      await waitFor(() => {
        expect(screen.getByText(/用户名或密码错误/i)).toBeInTheDocument()
      })
    })
  })
})
