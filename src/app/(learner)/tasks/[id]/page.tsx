import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/session'
import { db } from '@/db'
import { tasks, taskFiles, quizQuestions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import TaskDetailClient from './TaskDetailClient'

interface TaskFile {
  id: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  order: number
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
}

interface Task {
  id: string
  title: string
  description: string | null
  deadline: string | null
  createdBy: string
  createdAt: string
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function validateRequest(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  if (!cookieHeader) {
    return null
  }

  const match = cookieHeader.match(/session-token=([^;]+)/)
  if (!match) {
    return null
  }

  const token = match[1]
  const session = await validateSession(token)

  return session ? { userId: session.userId } : null
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id: taskId } = await params

  // Validate session
  const session = await validateRequest()
  if (!session) {
    redirect('/login')
  }

  // Fetch task
  const taskResult = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })

  if (!taskResult) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">任务不存在</h1>
        <a href="/dashboard" className="text-blue-600 hover:underline">
          返回仪表盘
        </a>
      </div>
    )
  }

  // Fetch files
  const filesResult = await db.query.taskFiles.findMany({
    where: eq(taskFiles.taskId, taskId),
    orderBy: (files, { asc }) => [asc(files.order)],
  })

  // Fetch quiz questions for this task
  const questionsResult = await db.query.quizQuestions.findMany({
    where: eq(quizQuestions.taskId, taskId),
  })

  // Transform data to match client interface
  const task: Task = {
    id: taskResult.id,
    title: taskResult.title,
    description: taskResult.description,
    deadline: taskResult.deadline?.toISOString() ?? null,
    createdBy: taskResult.createdBy,
    createdAt: taskResult.createdAt.toISOString(),
  }

  const files: TaskFile[] = filesResult.map((f) => ({
    id: f.id,
    title: f.title,
    fileUrl: f.fileUrl,
    fileType: f.fileType,
    fileSize: Number(f.fileSize),
    order: f.order,
  }))

  const questions: QuizQuestion[] = questionsResult.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options as string[],
  }))

  return <TaskDetailClient task={task} files={files} questions={questions} />
}
