import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, quizQuestions, quizSubmissions, taskAssignments, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and, count } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId } = await params

  try {
    // Get current user to check role
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 })
    }

    // Check access permissions
    // Admin can access all tasks, regular users can only access assigned tasks
    if (currentUser.role !== 'admin') {
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
        return NextResponse.json({ success: false, error: '无权访问此任务' }, { status: 403 })
      }
    }

    // Get total questions count
    const questionCountResult = await db
      .select({ count: count() })
      .from(quizQuestions)
      .where(eq(quizQuestions.taskId, taskId))

    const totalQuestions = questionCountResult[0]?.count ?? 0

    // Get user's quiz submissions for this task
    const userSubmissions = await db
      .select()
      .from(quizSubmissions)
      .where(
        and(
          eq(quizSubmissions.taskId, taskId),
          eq(quizSubmissions.userId, auth.userId)
        )
      )

    const userAttempts = userSubmissions.length
    const hasPassed = userSubmissions.some(s => s.passed)

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        title: task.title,
        totalQuestions,
        passingScore: task.passingScore,
        strictMode: task.strictMode,
        userAttempts,
        hasPassed,
      },
    })
  } catch (error) {
    console.error('Failed to fetch quiz info:', error)
    return NextResponse.json({ success: false, error: '获取测验信息失败' }, { status: 500 })
  }
}

// POST /api/tasks/[id]/quiz - 添加题目
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId } = await params

  try {
    const body = await request.json()
    const { question, options, correctAnswer } = body

    // Validate required fields
    if (!question || !options || correctAnswer === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: question, options, correctAnswer' },
        { status: 400 }
      )
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return NextResponse.json(
        { success: false, error: '选项必须为4个' },
        { status: 400 }
      )
    }

    if (correctAnswer < 0 || correctAnswer > 3) {
      return NextResponse.json(
        { success: false, error: '正确答案索引必须在0-3之间' },
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

    // Check if user is admin - admins can create questions for any task
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    const isAdmin = user?.role === 'admin'

    // Check if user has access to this task (skip for admins)
    if (!isAdmin) {
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
    }

    // Create the question
    const [newQuestion] = await db
      .insert(quizQuestions)
      .values({
        taskId,
        question,
        options,
        correctAnswer,
      })
      .returning({
        id: quizQuestions.id,
        taskId: quizQuestions.taskId,
        question: quizQuestions.question,
        options: quizQuestions.options,
        correctAnswer: quizQuestions.correctAnswer,
      })

    return NextResponse.json({
      success: true,
      data: newQuestion,
    })
  } catch (error) {
    console.error('创建题目失败:', error)
    return NextResponse.json(
      { success: false, error: '创建题目失败' },
      { status: 500 }
    )
  }
}
