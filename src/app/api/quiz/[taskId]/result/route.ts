import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizAnswers, quizQuestions, taskAssignments, tasks, users, quizSubmissions } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and, sql } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{
    taskId: string
  }>
}

// GET /api/quiz/[taskId]/result - 获取指定任务的测验结果
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { taskId } = await params

  try {
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

    // Get current user to check role
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    const isAdmin = currentUser?.role === 'admin'

    // Check if user has access to this task
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

    // Get quiz statistics for this task
    const stats = await db
      .select({
        totalQuestions: sql<number>`COUNT(DISTINCT ${quizQuestions.id})`,
        answeredQuestions: sql<number>`COUNT(DISTINCT ${quizAnswers.questionId})`,
        correctAnswers: sql<number>`COALESCE(SUM(CASE WHEN ${quizAnswers.isCorrect} THEN 1 ELSE 0 END), 0)`,
        lastAnsweredAt: sql<Date | null>`MAX(${quizAnswers.answeredAt})`,
      })
      .from(quizQuestions)
      .leftJoin(quizAnswers, eq(quizAnswers.questionId, quizQuestions.id))
      .where(eq(quizQuestions.taskId, taskId))

    const result = stats[0]
    const totalQuestions = Number(result?.totalQuestions) || 0
    const answeredQuestions = Number(result?.answeredQuestions) || 0
    const correctAnswers = Number(result?.correctAnswers) || 0

    // Get user's submission history for this task
    const submissions = await db
      .select({
        id: quizSubmissions.id,
        score: quizSubmissions.score,
        passed: quizSubmissions.passed,
        totalQuestions: quizSubmissions.totalQuestions,
        correctAnswers: quizSubmissions.correctAnswers,
        attemptCount: quizSubmissions.attemptCount,
        submittedAt: quizSubmissions.submittedAt,
      })
      .from(quizSubmissions)
      .where(
        and(
          eq(quizSubmissions.taskId, taskId),
          eq(quizSubmissions.userId, auth.userId)
        )
      )
      .orderBy(sql`${quizSubmissions.submittedAt} DESC`)

    // Calculate current accuracy
    const accuracy = answeredQuestions > 0
      ? Math.round((correctAnswers / answeredQuestions) * 100)
      : 0

    // Get user's best score (lowest attempt count with passed = true)
    const passedSubmissions = submissions.filter(s => s.passed)
    const bestScore = passedSubmissions.length > 0
      ? passedSubmissions.reduce((best, current) =>
          current.attemptCount < best.attemptCount ? current : best
        )
      : null

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        accuracy,
        lastAnsweredAt: result?.lastAnsweredAt,
        userAttempts: submissions.length,
        hasPassed: submissions.some(s => s.passed),
        bestScore: bestScore ? {
          score: bestScore.score,
          attemptCount: bestScore.attemptCount,
        } : null,
        submissions: submissions.map(s => ({
          id: s.id,
          score: s.score,
          passed: s.passed,
          totalQuestions: s.totalQuestions,
          correctAnswers: s.correctAnswers,
          attemptCount: s.attemptCount,
          submittedAt: s.submittedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Failed to fetch quiz result:', error)
    return NextResponse.json(
      { success: false, error: '获取测验结果失败' },
      { status: 500 }
    )
  }
}
