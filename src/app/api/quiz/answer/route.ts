import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizAnswers, quizQuestions } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { ZodError, z } from 'zod'
import { eq, and } from 'drizzle-orm'

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.number().int().min(0),
})

export async function POST(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = answerSchema.parse(body)

    // 获取题目
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, validated.questionId))
      .limit(1)

    if (!question) {
      return NextResponse.json({ success: false, error: '题目不存在' }, { status: 404 })
    }

    // 检查是否已回答
    const [existing] = await db
      .select()
      .from(quizAnswers)
      .where(
        and(
          eq(quizAnswers.userId, auth.userId),
          eq(quizAnswers.questionId, validated.questionId)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json({ success: false, error: '已回答过此题目' }, { status: 400 })
    }

    const isCorrect = validated.answer === question.correctAnswer

    await db.insert(quizAnswers).values({
      userId: auth.userId,
      questionId: validated.questionId,
      answer: validated.answer,
      isCorrect,
    })

    return NextResponse.json({
      success: true,
      isCorrect,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    )
  }
}
