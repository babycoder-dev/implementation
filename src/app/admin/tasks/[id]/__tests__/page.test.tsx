import { render, screen, waitFor } from '@testing-library/react'
import TaskEditorPage from '../page'

describe('TaskEditorPage', () => {
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
