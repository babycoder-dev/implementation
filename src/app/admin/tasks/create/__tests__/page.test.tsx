import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as nextNavigation from 'next/navigation'
import CreateTaskPage from '../page'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}))

describe('CreateTaskPage', () => {
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
    vi.spyOn(nextNavigation, 'usePathname').mockReturnValue('/admin/tasks/create')
  })

  it('renders page with title', () => {
    render(<CreateTaskPage />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('创建任务')
  })

  it('renders all form fields', () => {
    render(<CreateTaskPage />)
    expect(screen.getByLabelText('标题 *')).toBeInTheDocument()
    expect(screen.getByLabelText('描述')).toBeInTheDocument()
    expect(screen.getByLabelText('截止时间')).toBeInTheDocument()
  })

  it('shows validation errors for empty title', async () => {
    render(<CreateTaskPage />)

    const titleInput = screen.getByLabelText('标题 *')
    fireEvent.blur(titleInput)

    // Title is required
    expect(titleInput).toBeRequired()
  })

  it('calls API on submit with correct data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, task: { id: 'new-task-id' } })
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<CreateTaskPage />)

    fireEvent.change(screen.getByLabelText('标题 *'), { target: { value: 'Test Task' } })
    fireEvent.change(screen.getByLabelText('描述'), { target: { value: 'Test Description' } })

    // Submit
    const submitButton = screen.getByRole('button', { name: '创建任务' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Task',
          description: 'Test Description',
          assignedUserIds: [],
          files: [],
        }),
      }))
    })
  })

  it('disables submit button during loading', async () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    vi.stubGlobal('fetch', mockFetch)

    render(<CreateTaskPage />)

    fireEvent.change(screen.getByLabelText('标题 *'), { target: { value: 'Test Task' } })

    const submitButton = screen.getByRole('button', { name: '创建任务' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('navigates to task list on successful creation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, task: { id: 'new-task-id' } })
    }))

    render(<CreateTaskPage />)

    fireEvent.change(screen.getByLabelText('标题 *'), { target: { value: 'Test Task' } })
    fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/tasks')
    })
  })

  it('has back link to task list', () => {
    render(<CreateTaskPage />)

    const backLink = screen.getByRole('link', { name: /返回/ })
    expect(backLink).toHaveAttribute('href', '/admin/tasks')
  })
})
