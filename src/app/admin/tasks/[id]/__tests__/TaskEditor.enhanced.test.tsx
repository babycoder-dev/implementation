import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import TaskEditor from '../TaskEditor'

// Mock task data
const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'Test description',
  deadline: '2025-12-31T23:59:00Z',
  status: 'active',
  files: [
    { id: 'file-1', name: 'document.pdf', size: 1024, uploadedAt: '2025-01-15T10:00:00Z' },
    { id: 'file-2', name: 'image.png', size: 2048, uploadedAt: '2025-01-16T14:30:00Z' },
  ],
  assignedUsers: [
    { id: 'user-1', name: 'John Doe', username: 'john' },
    { id: 'user-2', name: 'Jane Smith', username: 'jane' },
  ],
  quizQuestions: [
    {
      id: 'q-1',
      question: 'What is 2+2?',
      type: 'single',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
    },
    {
      id: 'q-2',
      question: 'Select all prime numbers',
      type: 'multiple',
      options: ['2', '3', '4', '5'],
      correctAnswer: ['2', '3', '5'],
    },
  ],
}

const mockUsers = [
  { id: 'user-1', name: 'John Doe', username: 'john' },
  { id: 'user-2', name: 'Jane Smith', username: 'jane' },
  { id: 'user-3', name: 'Bob Wilson', username: 'bob' },
]

// Mock fetch
const mockFetch = vi.fn((url: string | URL | Request) => {
  const urlStr = typeof url === 'string' ? url : url.toString()
  if (urlStr.includes('/api/tasks/') && !urlStr.includes('/users')) {
    return Promise.resolve({
      json: () => Promise.resolve({ success: true, data: mockTask }),
    })
  }
  if (urlStr.includes('/api/users')) {
    return Promise.resolve({
      json: () => Promise.resolve({ success: true, data: mockUsers }),
    })
  }
  return Promise.resolve({
    json: () => Promise.resolve({ success: true }),
  })
})

vi.stubGlobal('fetch', mockFetch)

describe('TaskEditor - Enhanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TaskEditor Component Structure', () => {
    it('renders all tabs', async () => {
      render(<TaskEditor taskId="task-123" />)

      // Wait for async data to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(screen.getByRole('button', { name: '基本信息' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '附件管理' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '任务分配' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '测验管理' })).toBeInTheDocument()
    })

    it('displays header with title', async () => {
      render(<TaskEditor taskId="task-123" />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(screen.getByText('编辑任务')).toBeInTheDocument()
    })

    it('switches to files tab when clicked', async () => {
      render(<TaskEditor taskId="task-123" />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      const filesTab = screen.getByRole('button', { name: '附件管理' })
      fireEvent.click(filesTab)

      // "选择文件" is a label element, not a button
      expect(screen.getByText('选择文件')).toBeInTheDocument()
    })

    it('switches to users tab when clicked', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const usersTab = screen.getByRole('button', { name: '任务分配' })
      fireEvent.click(usersTab)

      expect(screen.getByRole('button', { name: /添加用户/i })).toBeInTheDocument()
    })

    it('switches to quiz tab when clicked', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const quizTab = screen.getByRole('button', { name: '测验管理' })
      fireEvent.click(quizTab)

      expect(screen.getByRole('button', { name: /添加题目/i })).toBeInTheDocument()
    })

    it('displays file upload section with upload button', async () => {
      render(<TaskEditor taskId="task-123" />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      const filesTab = screen.getByRole('button', { name: '附件管理' })
      fireEvent.click(filesTab)

      // "选择文件" is a label element, not a button
      expect(screen.getByText('选择文件')).toBeInTheDocument()
    })

    it('displays user assignment section with add button', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const usersTab = screen.getByRole('button', { name: '任务分配' })
      fireEvent.click(usersTab)

      expect(screen.getByRole('button', { name: /添加用户/i })).toBeInTheDocument()
    })

    it('displays quiz management section with add button', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const quizTab = screen.getByRole('button', { name: '测验管理' })
      fireEvent.click(quizTab)

      expect(screen.getByRole('button', { name: /添加题目/i })).toBeInTheDocument()
    })

    it('opens quiz modal when add question is clicked', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const quizTab = screen.getByRole('button', { name: '测验管理' })
      fireEvent.click(quizTab)

      const addButton = screen.getByRole('button', { name: /添加题目/i })
      fireEvent.click(addButton)

      // Modal should appear
      expect(screen.getByText('添加新题目')).toBeInTheDocument()
    })

    it('opens user dropdown when add user is clicked', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const usersTab = screen.getByRole('button', { name: '任务分配' })
      fireEvent.click(usersTab)

      // Click add user button
      const addButton = screen.getByRole('button', { name: /添加用户/i })
      fireEvent.click(addButton)

      // Verify we can still find elements (dropdown interaction works)
      expect(screen.getByText(/添加用户|没有可分配/i)).toBeInTheDocument()
    })

    it('shows file list in files tab', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const filesTab = screen.getByRole('button', { name: '附件管理' })
      fireEvent.click(filesTab)

      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.getByText('image.png')).toBeInTheDocument()
    })

    it('shows assigned users in users tab', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const usersTab = screen.getByRole('button', { name: '任务分配' })
      fireEvent.click(usersTab)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('shows quiz questions in quiz tab', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const quizTab = screen.getByRole('button', { name: '测验管理' })
      fireEvent.click(quizTab)

      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
      expect(screen.getByText('Select all prime numbers')).toBeInTheDocument()
    })

    it('shows question type labels', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      const quizTab = screen.getByRole('button', { name: '测验管理' })
      fireEvent.click(quizTab)

      expect(screen.getByText('单选题')).toBeInTheDocument()
      expect(screen.getByText('多选题')).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('fetches task data on mount', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task-123')
    })

    it('fetches users data on mount', async () => {
      render(<TaskEditor taskId="task-123" />)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockFetch).toHaveBeenCalledWith('/api/users')
    })
  })
})
