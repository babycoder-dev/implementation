import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import QuizClient from '../QuizClient'

// Mock fetch globally
global.fetch = vi.fn() as unknown as typeof global.fetch

// Mock Next.js useRouter
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
}))

describe('QuizClient', () => {
  const mockQuestions = [
    { id: '1', question: 'What is 2+2?', options: ['3', '4', '5'] },
    { id: '2', question: 'What is 3+3?', options: ['5', '6', '7'] }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays quiz questions', async () => {
    render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    await waitFor(() => {
      expect(screen.getByText(/What is 2\+2\?/)).toBeTruthy()
      expect(screen.getByText(/What is 3\+3\?/)).toBeTruthy()
    })
  })

  it('shows result after submission', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { score: 2, total: 2 }
      })
    } as Response)

    render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText(/What is 2\+2\?/)).toBeTruthy()
    })

    // Select answers by clicking on radio buttons
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]) // Q1 - Option B (index 1)
    fireEvent.click(radios[4]) // Q2 - Option B (index 4)

    // Submit
    const submitButton = screen.getByRole('button', { name: /提交答案/i })
    fireEvent.click(submitButton)

    // Wait for result - check for result title
    await waitFor(() => {
      expect(screen.getByText('测验结果')).toBeTruthy()
    })
  })

  it('shows error when not all questions answered', async () => {
    render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Select only one answer
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]) // Q1 - Option B (index 1)

    // Submit without answering all - button should be disabled
    const submitButton = screen.getByRole('button', { name: /提交答案/i })
    expect(submitButton.hasAttribute('disabled')).toBe(true)
  })

  it('shows passed result correctly (score >= 60%)', async () => {
    // Score of 2/2 = 100% pass
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { score: 2, total: 2 }
      })
    } as Response)

    render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Answer both questions (select all "B" options = indices 1, 4)
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]) // Q1 - Option B
    fireEvent.click(radios[4]) // Q2 - Option B

    const submitButton = screen.getByRole('button', { name: /提交答案/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('测验结果')).toBeTruthy()
      expect(screen.getByText('及格')).toBeTruthy()
    })
  })
})
