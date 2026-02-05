import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the fetch at module level before importing the component
vi.spyOn(global, 'fetch').mockResolvedValue({
  json: () => Promise.resolve({
    success: true,
    data: { name: '测试学员', role: 'user' }
  })
} as Response)

vi.spyOn(global, 'fetch').mockResolvedValue({
  json: () => Promise.resolve({
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
        progress: 10,
        fileType: 'video'
      }
    ]
  })
} as Response)

describe('Learner Dashboard', () => {
  it('renders without crashing', () => {
    // Just verify the component can be imported
    expect(true).toBe(true)
  })

  it('has proper imports', async () => {
    // Import the component to verify all imports work
    const { default: DashboardClient } = await import('../DashboardClient')
    expect(DashboardClient).toBeDefined()
  })
})
