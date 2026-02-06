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
    const { container } = render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Wait for Q1 to load
    await waitFor(() => {
      expect(screen.getByText(/What is 2\+2\?/)).toBeTruthy()
    })

    // Navigate to Q2 to verify it's also there
    const nextButton = screen.getByRole('button', { name: /下一题/i })
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/What is 3\+3\?/)).toBeTruthy()
    })
  })

  it('shows result after submission', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { score: 2, total: 2, answers: [] }
      })
    } as Response)

    const { container } = render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText(/What is 2\+2\?/)).toBeTruthy()
    })

    // Select answer for Q1 by clicking on the label (more reliable)
    const labelQ1OptionB = screen.getByLabelText(/B\./)
    fireEvent.click(labelQ1OptionB)

    // Click "下一题" to navigate to Q2
    const nextButton = screen.getByRole('button', { name: /下一题/i })
    fireEvent.click(nextButton)

    // Select answer for Q2
    const labelQ2OptionB = screen.getByLabelText(/B\./)
    fireEvent.click(labelQ2OptionB)

    // Use container.querySelector to find the submit button (last button with this text)
    const submitButtons = container.querySelectorAll('button')
    const submitButton = Array.from(submitButtons).find(btn => btn.textContent?.includes('提交答案'))
    expect(submitButton).toBeTruthy()
    fireEvent.click(submitButton!)

    // Wait for result - check for result title
    await waitFor(() => {
      expect(screen.getByText('测验结果')).toBeTruthy()
    })
  })

  it('shows error when not all questions answered', async () => {
    const { container } = render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText(/What is 2\+2\?/)).toBeTruthy()
    })

    // Select only one answer for Q1
    const labelQ1OptionB = screen.getByLabelText(/B\./)
    fireEvent.click(labelQ1OptionB)

    // Click "下一题" to navigate to Q2 but don't answer
    const nextButton = screen.getByRole('button', { name: /下一题/i })
    fireEvent.click(nextButton)

    // Verify Q2 is displayed
    await waitFor(() => {
      expect(screen.getByText(/What is 3\+3\?/)).toBeTruthy()
    })

    // The "提交答案" button should NOT be enabled because not all questions are answered
    // When on the last question with incomplete answers, the button is disabled
    const allButtons = Array.from(container.querySelectorAll('button'))
    const submitButtons = allButtons.filter(btn => btn.textContent?.includes('提交答案'))
    expect(submitButtons.length).toBeGreaterThan(0)

    // All submit buttons should be disabled when not all questions are answered
    submitButtons.forEach(btn => {
      expect(btn).toHaveAttribute('disabled')
    })
  })

  it('shows passed result correctly (score >= 60%)', async () => {
    // Score of 2/2 = 100% pass
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { score: 2, total: 2, answers: [] }
      })
    } as Response)

    const { container } = render(<QuizClient taskId="task-123" questions={mockQuestions} />)

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText(/What is 2\+2\?/)).toBeTruthy()
    })

    // Answer Q1 - select option B
    const labelQ1OptionB = screen.getByLabelText(/B\./)
    fireEvent.click(labelQ1OptionB)

    // Click "下一题" to navigate to Q2
    const nextButton = screen.getByRole('button', { name: /下一题/i })
    fireEvent.click(nextButton)

    // Answer Q2 - select option B
    const labelQ2OptionB = screen.getByLabelText(/B\./)
    fireEvent.click(labelQ2OptionB)

    // Submit - use the last submit button which appears on the last question
    const allButtons = container.querySelectorAll('button')
    const submitButton = Array.from(allButtons).filter(btn => btn.textContent?.includes('提交答案')).pop()
    expect(submitButton).toBeTruthy()
    fireEvent.click(submitButton!)

    await waitFor(() => {
      expect(screen.getByText('测验结果')).toBeTruthy()
      expect(screen.getByText('及格')).toBeTruthy()
    })
  })
})
