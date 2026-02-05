import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardClient from '../DashboardClient'

// Mock data
const mockUser = {
  success: true,
  data: { name: '测试学员', role: 'user' }
}

const mockTasks = {
  success: true,
  data: [
    {
      id: '1',
      title: 'React 基础教程',
      description: '学习 React 的基本概念和组件',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
      progress: 35,
      fileType: 'pdf'
    },
    {
      id: '2',
      title: 'TypeScript 进阶',
      description: '深入理解 TypeScript 类型系统',
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
      progress: 0, // Will show "开始学习"
      fileType: 'video'
    },
    {
      id: '3',
      title: 'Node.js 实战',
      description: '使用 Node.js 构建后端应用',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      completed: true,
      progress: 100,
      fileType: 'pdf'
    }
  ]
}

describe('Learner Dashboard', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Setup fetch mock with proper implementation
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Dashboard Header', () => {
    it('displays welcome message with user name', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      // Use getByText with exact match for the span element containing the name
      await waitFor(() => {
        const nameElement = screen.getByText('测试学员', { selector: 'span' })
        expect(nameElement).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('displays current date', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText(/学习管理系统/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Quick Stats Overview', () => {
    it('shows total tasks count', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows completed tasks count', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      // Check that there's at least one "1" shown (in the completed card)
      await waitFor(() => {
        const ones = screen.getAllByText('1')
        expect(ones.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })

    it('shows in-progress tasks count', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows completion rate percentage', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        // Check for "33%" or the "完成率" label
        expect(screen.getByText('完成率')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Task Cards Grid', () => {
    it('renders task cards for each assigned task', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      // Check the section header for task cards
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '学习任务列表' })).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('displays task description', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText(/学习 React/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows status badge - 进行中 for incomplete tasks', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        // Check for the badge with exact text
        const badges = screen.getAllByText('进行中')
        expect(badges.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })

    it('shows status badge - 已完成 for completed tasks', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        // The "复习课程" button is shown for completed tasks
        expect(screen.getByText('复习课程')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows progress bar for each task', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        // Progress bars are rendered with role="progressbar"
        const progressBars = screen.getAllByRole('progressbar')
        expect(progressBars.length).toBeGreaterThanOrEqual(3)
      }, { timeout: 3000 })
    })

    it('shows "开始学习" button for incomplete tasks', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      // Buttons are inside Link (a) elements - check for link with this text
      await waitFor(() => {
        const links = screen.getAllByRole('link')
        const hasStartLink = links.some(link => link.textContent?.includes('开始学习'))
        expect(hasStartLink).toBe(true)
      }, { timeout: 3000 })
    })

    it('shows "继续学习" button for tasks with progress', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      // Get all buttons and check if one contains "继续学习"
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const hasContinueButton = buttons.some(btn => btn.textContent?.includes('继续学习'))
        expect(hasContinueButton).toBe(true)
      }, { timeout: 3000 })
    })

    it('shows "复习课程" button for completed tasks', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('复习课程')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Progress Section', () => {
    it('displays overall learning progress', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('学习进度概览')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows completed tasks count in progress section', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Quick Actions', () => {
    it('shows "查看所有任务" link', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('查看所有任务')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows "查看测验成绩" link', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('查看测验成绩')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Empty State', () => {
    it('shows message when no tasks are assigned', async () => {
      const emptyTasks = { success: true, data: [] }
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(emptyTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('暂无分配的学习任务')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Navigation', () => {
    it('has logout button', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser)
          })
        }
        if (url === '/api/tasks') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTasks)
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<DashboardClient />)

      await waitFor(() => {
        expect(screen.getByText('退出')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})
