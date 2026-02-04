import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, vi, expect } from 'vitest'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('next/link', async (importOriginal) => {
  const mod = await importOriginal() as { default: React.ComponentType<any> }
  return {
    default: mod.default || ((props: any) => <a {...props} />),
  }
})

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Save: () => <span data-testid="save" />,
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))

import CreateTaskPage from '../page'

describe('CreateTaskPage', () => {
  it('shows create task form', () => {
    render(<CreateTaskPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('创建任务')
    expect(screen.getByPlaceholderText('输入任务标题')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入任务描述')).toBeInTheDocument()
  })
})
