import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import QuizClient from './QuizClient'

interface Question {
  id: string
  question: string
  options: string[]
}

interface QuizData {
  success: boolean
  data?: Question[]
  error?: string
}

async function getSession() {
  const cookieStore = await cookies()
  const match = cookieStore.toString().match(/session-token=([^;]+)/)
  if (!match) return null

  const session = await validateSession(match[1])
  return session ? { userId: session.userId } : null
}

async function fetchQuizQuestions(taskId: string, cookieHeader: string): Promise<QuizData> {
  try {
    const res = await fetch(`${process.env.API_URL || ''}/api/quiz/questions?taskId=${taskId}`, {
      headers: { cookie: cookieHeader }
    })

    if (!res.ok) {
      const error = await res.json()
      return { success: false, error: error.error || '获取题目失败' }
    }

    const data = await res.json()
    return { success: true, data: data.data }
  } catch {
    return { success: false, error: '获取题目失败' }
  }
}

export default async function QuizPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const quizResult = await fetchQuizQuestions(params.id, cookieStore.toString())

  if (!quizResult.success || !quizResult.data || quizResult.data.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          {quizResult.error || '暂无测验题目'}
        </div>
      </div>
    )
  }

  return <QuizClient taskId={params.id} questions={quizResult.data} />
}
