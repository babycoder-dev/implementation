import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { quizAnswers, quizQuestions, taskAssignments, tasks, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and, sql } from 'drizzle-orm'

// GET /api/quiz/results - 获取测验统计结果 (向后兼容)
// 推荐使用: GET /api/quiz/[taskId]/result 获取单个任务结果
export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    // Check if user has access to this task (if taskId provided)
    if (taskId) {
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

      // Admin can view all results, regular users need assignment
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, auth.userId))
        .limit(1)

      if (!assignment && (!currentUser || currentUser.role !== 'admin')) {
        return NextResponse.json(
          { success: false, error: '无权访问此任务' },
          { status: 403 }
        )
      }
    }

    // Build base query
    let results: Array<{
      taskId: string | null
      taskTitle: string | null
      totalQuestions: number
      answeredQuestions: number
      correctAnswers: number
      lastAnsweredAt: Date | null
    }> = []

    // isCorrect is now computed at query time
    if (taskId) {
      results = await db
        .select({
          taskId: quizQuestions.taskId,
          taskTitle: tasks.title,
          totalQuestions: sql<number>`COUNT(DISTINCT ${quizQuestions.id})`,
          answeredQuestions: sql<number>`COUNT(DISTINCT ${quizAnswers.questionId})`,
          correctAnswers: sql<number>`COALESCE(SUM(CASE WHEN ${quizAnswers.answer} = ${quizQuestions.correctAnswer} THEN 1 ELSE 0 END), 0)`,
          lastAnsweredAt: sql<Date | null>`MAX(${quizAnswers.answeredAt})`,
        })
        .from(quizQuestions)
        .leftJoin(quizAnswers, eq(quizAnswers.questionId, quizQuestions.id))
        .leftJoin(tasks, eq(quizQuestions.taskId, tasks.id))
        .where(eq(quizQuestions.taskId, taskId))
        .groupBy(quizQuestions.taskId, tasks.title) as unknown as typeof results
    } else {
      results = await db
        .select({
          taskId: quizQuestions.taskId,
          taskTitle: tasks.title,
          totalQuestions: sql<number>`COUNT(DISTINCT ${quizQuestions.id})`,
          answeredQuestions: sql<number>`COUNT(DISTINCT ${quizAnswers.questionId})`,
          correctAnswers: sql<number>`COALESCE(SUM(CASE WHEN ${quizAnswers.answer} = ${quizQuestions.correctAnswer} THEN 1 ELSE 0 END), 0)`,
          lastAnsweredAt: sql<Date | null>`MAX(${quizAnswers.answeredAt})`,
        })
        .from(quizQuestions)
        .leftJoin(quizAnswers, eq(quizAnswers.questionId, quizQuestions.id))
        .leftJoin(tasks, eq(quizQuestions.taskId, tasks.id))
        .groupBy(quizQuestions.taskId, tasks.title) as unknown as typeof results
    }

    // Filter by user for non-admin
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    let filteredResults = results
    if (!currentUser || currentUser.role !== 'admin') {
      // For non-admin, only show their own results
      const userAnswers = await db
        .select({
          taskId: quizQuestions.taskId,
        })
        .from(quizAnswers)
        .innerJoin(quizQuestions, eq(quizAnswers.questionId, quizQuestions.id))
        .where(eq(quizAnswers.userId, auth.userId))

      const userTaskIds: string[] = Array.from(new Set(userAnswers.map(a => a.taskId)))
      filteredResults = results.filter(r => r.taskId && userTaskIds.includes(r.taskId))
    }

    // Calculate accuracy for each task
    const formattedResults = filteredResults.map((r) => ({
      taskId: r.taskId,
      taskTitle: r.taskTitle,
      totalQuestions: Number(r.totalQuestions) || 0,
      answeredQuestions: Number(r.answeredQuestions) || 0,
      correctAnswers: Number(r.correctAnswers) || 0,
      accuracy:
        Number(r.answeredQuestions) > 0
          ? Math.round(
              (Number(r.correctAnswers) / Number(r.answeredQuestions)) * 100
            )
          : 0,
      lastAnsweredAt: r.lastAnsweredAt,
    }))

    return NextResponse.json({
      success: true,
      data: formattedResults,
    })
  } catch (error) {
    console.error('Failed to fetch quiz results:', error)
    return NextResponse.json(
      { success: false, error: '获取测验结果失败' },
      { status: 500 }
    )
  }
}
