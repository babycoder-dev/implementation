import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizAnswers, quizQuestions } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { ZodError, z } from 'zod'
import { eq, inArray } from 'drizzle-orm'

const submitSchema = z.object({
  taskId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answer: z.number().int().min(0),
  })),
})

export async function POST(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskId, answers } = submitSchema.parse(body)

    if (answers.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有答案可提交' },
        { status: 400 }
      )
    }

    // Get all question IDs
    const questionIds = answers.map(a => a.questionId)

    // Fetch all questions to verify and get correct answers
    const questions = await db
      .select({
        id: quizQuestions.id,
        correctAnswer: quizQuestions.correctAnswer,
      })
      .from(quizQuestions)
      .where(inArray(quizQuestions.id, questionIds))

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { success: false, error: '部分题目不存在' },
        { status: 400 }
      )
    }

    // Create a map for quick lookup
    const questionMap = new Map(questions.map(q => [q.id, q]))

    // Check for already answered questions
    const answeredQuestions = await db
      .select({ questionId: quizAnswers.questionId })
      .from(quizAnswers)
      .where(
        inArray(
          quizAnswers.questionId,
          answers.map(a => a.questionId)
        )
      )

    if (answeredQuestions.length > 0) {
      return NextResponse.json(
        { success: false, error: '部分题目已回答过' },
        { status: 400 }
      )
    }

    // Grade and insert answers
    let correctCount = 0
    const answersToInsert = answers.map(a => {
      const question = questionMap.get(a.questionId)
      const isCorrect = question ? a.answer === question.correctAnswer : false
      if (isCorrect) correctCount++
      return {
        userId: auth.userId,
        questionId: a.questionId,
        answer: a.answer,
        isCorrect,
      }
    })

    await db.insert(quizAnswers).values(answersToInsert)

    return NextResponse.json({
      success: true,
      data: {
        score: correctCount,
        total: answers.length,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400 }
      )
    }

    console.error('Submit quiz answers error:', error)
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    )
  }
}
