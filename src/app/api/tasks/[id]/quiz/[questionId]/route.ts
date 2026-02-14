import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizQuestions, taskAssignments, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{
    id: string
    questionId: string
  }>
}

// Helper function to validate question access
async function validateQuestionAccess(
  request: NextRequest,
  taskId: string,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  // Get the user to check role
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  // Admin has full access
  if (user?.role === 'admin') {
    return { valid: true }
  }

  // Check if user has access to the task
  const [assignment] = await db
    .select()
    .from(taskAssignments)
    .where(
      and(
        eq(taskAssignments.taskId, taskId),
        eq(taskAssignments.userId, userId)
      )
    )
    .limit(1)

  if (!assignment) {
    return { valid: false, error: '无权访问此任务' }
  }

  return { valid: true }
}

// PUT /api/tasks/[id]/quiz/[questionId] - 更新题目
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId, questionId } = await params

  // Validate task access
  const accessValidation = await validateQuestionAccess(request, taskId, auth.userId)
  if (!accessValidation.valid) {
    return NextResponse.json(
      { success: false, error: accessValidation.error },
      { status: 403 }
    )
  }

  try {
    // Check if question exists and belongs to this task
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1)

    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      )
    }

    // Verify question belongs to this task
    if (question.taskId !== taskId) {
      return NextResponse.json(
        { success: false, error: '题目不属于此任务' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { question: questionText, options, correctAnswer } = body

    // Validate fields
    if (!questionText && !options && correctAnswer === undefined) {
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
    if (questionText !== undefined) updateData.question = questionText
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

// DELETE /api/tasks/[id]/quiz/[questionId] - 删除题目
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId, questionId } = await params

  // Validate task access
  const accessValidation = await validateQuestionAccess(request, taskId, auth.userId)
  if (!accessValidation.valid) {
    return NextResponse.json(
      { success: false, error: accessValidation.error },
      { status: 403 }
    )
  }

  try {
    // Check if question exists and belongs to this task
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1)

    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      )
    }

    // Verify question belongs to this task
    if (question.taskId !== taskId) {
      return NextResponse.json(
        { success: false, error: '题目不属于此任务' },
        { status: 400 }
      )
    }

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
