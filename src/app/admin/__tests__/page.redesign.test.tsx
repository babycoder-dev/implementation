import { render, screen, waitFor } from '@testing-library/react'
import AdminPage from '../page'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as nextRouter from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(),
}))

// Mock the dashboard API
const mockDashboardData = {
  success: true,
  data: {
    taskCount: 150,
    userCount: 45,
    assignmentCount: 320,
    answerCorrect: 285,
    answerTotal: 350,
    recentTasks: [
      { id: '1', title: '数学测试', createdAt: '2026-02-01T10:00:00Z', status: 'active' },
      { id: '2', title: '英语练习', createdAt: '2026-02-02T10:00:00Z', status: 'completed' },
    ],
    recentUsers: [
      { id: '1', username: '张三', createdAt: '2026-02-01T10:00:00Z', role: 'learner' },
      { id: '2', username: '李四', createdAt: '2026-02-02T10:00:00Z', role: 'learner' },
    ],
    trend: {
      users: '+12%',
      tasks: '+8%',
      assignments: '+15%',
      completionRate: '+5%',
    },
  },
}

describe('Admin Dashboard Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Mock AdminLayout
  vi.mock('@/components/layout/AdminLayout', () => ({
    AdminLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="admin-layout">{children}</div>
    ),
  }))

  it('displays page title and subtitle', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('管理后台')).toBeInTheDocument()
      expect(screen.getByText('数据概览')).toBeInTheDocument()
    })
  })

  it('shows current date in header', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      const dateElement = screen.getByText(/2026年/)
      expect(dateElement).toBeInTheDocument()
    })
  })

  it('renders all 4 KPI cards with numbers', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      // Check specific numbers in KPI cards (first occurrence)
      expect(screen.getByText('45')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('320')).toBeInTheDocument()
      // Use regex to find just 81% without matching other variants
      expect(screen.getAllByText(/^81%$/)[0]).toBeInTheDocument()
    })
  })

  it('displays KPI card labels', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('用户总数')).toBeInTheDocument()
      expect(screen.getByText('任务总数')).toBeInTheDocument()
      expect(screen.getByText('任务分配')).toBeInTheDocument()
      expect(screen.getByText('完成率')).toBeInTheDocument()
    })
  })

  it('shows trend indicators', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('+12%')).toBeInTheDocument()
      expect(screen.getByText('+8%')).toBeInTheDocument()
      expect(screen.getByText('+15%')).toBeInTheDocument()
      expect(screen.getByText('+5%')).toBeInTheDocument()
    })
  })

  it('displays create task button', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      // Button text is nested inside button element
      const buttons = screen.getAllByRole('button')
      const createTaskBtn = buttons.find(btn =>
        btn.innerHTML.includes('创建任务')
      )
      expect(createTaskBtn).toBeInTheDocument()
    })
  })

  it('displays add user button', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      const addUserBtn = buttons.find(btn =>
        btn.innerHTML.includes('添加用户')
      )
      expect(addUserBtn).toBeInTheDocument()
    })
  })

  it('displays view reports button', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      const viewReportsBtn = buttons.find(btn =>
        btn.innerHTML.includes('查看报表')
      )
      expect(viewReportsBtn).toBeInTheDocument()
    })
  })

  it('shows recent tasks section', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('最新任务')).toBeInTheDocument()
      expect(screen.getByText('数学测试')).toBeInTheDocument()
      expect(screen.getByText('英语练习')).toBeInTheDocument()
    })
  })

  it('shows recent users section', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('最新用户')).toBeInTheDocument()
      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
    })
  })

  it('shows task completion rate section', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('任务完成率')).toBeInTheDocument()
    })
  })

  it('displays completion progress bar', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })
})
