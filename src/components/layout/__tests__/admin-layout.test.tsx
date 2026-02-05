import { render, screen } from '@testing-library/react'
import { AdminSidebar } from '../AdminSidebar'
import { AdminHeader } from '../AdminHeader'
import { AdminLayout } from '../AdminLayout'
import { vi } from 'vitest'
import * as nextNavigation from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}))

describe('Admin Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(nextNavigation, 'usePathname').mockReturnValue('/admin')
  })

  it('renders sidebar with navigation', () => {
    render(<AdminSidebar />)
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('任务管理')).toBeInTheDocument()
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('数据报表')).toBeInTheDocument()
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('创建任务')).toBeInTheDocument()
  })

  it('renders header with user menu', () => {
    render(<AdminHeader />)
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument()
  })

  it('renders layout with sidebar and header', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
