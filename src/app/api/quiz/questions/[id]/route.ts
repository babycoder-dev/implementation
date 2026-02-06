import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizQuestions, taskAssignments } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'

// Helper function to validate question access
async function validateQuestionAccess(
  request: NextRequest,
  questionId: string
): Promise<{ valid: boolean; taskId?: string; error?: string }> {
  const auth = await validateRequest(request)
  if (!auth) {
    return { valid: false, error: '未授权' }
  }

  // Get the question
  const [question] = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.id, questionId))
    .limit(1)

  if (!question) {
    return { valid: false, error: '题目不存在' }
  }

  // Check if user has access to the task
  const [assignment] = await db
    .select()
    .from(taskAssignments)
    .where(
      and(
        eq(taskAssignments.taskId, question.taskId),
        eq(taskAssignments.userId, auth.userId)
      )
    )
    .limit(1)

  if (!assignment) {
    return { valid: false, error: '无权访问此题目' }
  }

  return { valid: true, taskId: question.taskId }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params

  const validation = await validateQuestionAccess(request, questionId)
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { question, options, correctAnswer } = body

    // Validate fields
    if (!question && !options && correctAnswer === undefined) {
      return NextResponse.json(
        { success: false, error: '至少需要一个要更新的字段' },
        { status: 400 }
      )
    }

    if (options) {
      if (!Array.isArray(options) || options.length !== 4) {
        return NextResponse.json(
          { success: false, error: '选项必须为4个' },
          { status: 400 }
        )
      }

      if (correctAnswer !== undefined && (correctAnswer < 0 || correctAnswer > 3)) {
        return NextResponse.json(
          { success: false, error: '正确答案索引必须在0-3之间' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (question !== undefined) updateData.question = question
    if (options !== undefined) updateData.options = options
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer

    // Update the question
    const [updatedQuestion] = await db
      .update(quizQuestions)
      .set(updateData)
      .where(eq(quizQuestions.id, questionId))
      .returning({
        id: quizQuestions.id,
        taskId: quizQuestions.taskId,
        question: quizQuestions.question,
        options: quizQuestions.options,
        correctAnswer: quizQuestions.correctAnswer,
      })

    return NextResponse.json({
      success: true,
      data: updatedQuestion,
    })
  } catch (error) {
    console.error('更新题目失败:', error)
    return NextResponse.json(
      { success: false, error: '更新题目失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params

  const validation = await validateQuestionAccess(request, questionId)
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 401 }
    )
  }

  try {
    await db
      .delete(quizQuestions)
      .where(eq(quizQuestions.id, questionId))

    return NextResponse.json({
      success: true,
      message: '题目已删除',
    })
  } catch (error) {
    console.error('删除题目失败:', error)
    return NextResponse.json(
      { success: false, error: '删除题目失败' },
      { status: 500 }
    )
  }
}
