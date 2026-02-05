import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizQuestions, taskAssignments, tasks } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少taskId参数' },
        { status: 400 }
      )
    }

    // Check if task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      )
    }

    // Check if user has access to this task
    const [assignment] = await db
      .select()
      .from(taskAssignments)
      .where(
        and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.userId, auth.userId)
        )
      )
      .limit(1)

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: '无权访问此任务' },
        { status: 403 }
      )
    }

    // Get questions for the task (without correctAnswer)
    const questions = await db
      .select({
        id: quizQuestions.id,
        taskId: quizQuestions.taskId,
        question: quizQuestions.question,
        options: quizQuestions.options,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.taskId, taskId))

    return NextResponse.json({
      success: true,
      data: questions,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '获取题目失败' },
      { status: 500 }
    )
  }
}
