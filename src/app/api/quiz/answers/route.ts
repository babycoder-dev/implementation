import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizAnswers, quizQuestions, taskAssignments } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and, desc, inArray } from 'drizzle-orm'

// GET /api/quiz/answers - 获取用户的答题记录
export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    // Build conditions array
    const conditions = [eq(quizAnswers.userId, auth.userId)]
    if (taskId) {
      conditions.push(eq(quizQuestions.taskId, taskId))
    }

    const answers = await db
      .select({
        id: quizAnswers.id,
        userId: quizAnswers.userId,
        questionId: quizAnswers.questionId,
        answer: quizAnswers.answer,
        isCorrect: quizAnswers.isCorrect,
        answeredAt: quizAnswers.answeredAt,
        question: {
          id: quizQuestions.id,
          taskId: quizQuestions.taskId,
          question: quizQuestions.question,
          options: quizQuestions.options,
          correctAnswer: quizQuestions.correctAnswer,
        },
      })
      .from(quizAnswers)
      .innerJoin(quizQuestions, eq(quizAnswers.questionId, quizQuestions.id))
      .where(and(...conditions))
      .orderBy(desc(quizAnswers.answeredAt))

    return NextResponse.json({
      success: true,
      data: answers,
    })
  } catch (error) {
    console.error('Failed to fetch quiz answers:', error)
    return NextResponse.json(
      { success: false, error: '获取答题记录失败' },
      { status: 500 }
    )
  }
}
