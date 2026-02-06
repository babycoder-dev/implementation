import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as nextNavigation from 'next/navigation'
import TaskEditorPage from '../page'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}))

describe('TaskEditorPage', () => {
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

  it('displays task title', async () => {
    // Mock API response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: '1',
          title: 'Test Task',
          description: 'Test Description',
          status: 'pending'
        }
      })
    }))

    render(<TaskEditorPage params={{ id: '1' }} />)

    // Wait for loading to complete and task to appear
    await waitFor(() => {
      const input = screen.getByDisplayValue('Test Task')
      expect(input).toBeDefined()
    })
  })
})
