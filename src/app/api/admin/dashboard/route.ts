import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, quizAnswers } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  // 检查管理员权限
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 })
  }

  try {
    // 总任务数
    const [taskCount] = await db.select({ count: count() }).from(tasks)

    // 总用户数
    const [userCount] = await db.select({ count: count() }).from(users)

    // 总分配数
    const [assignmentCount] = await db.select({ count: count() }).from(taskAssignments)

    // 答题统计
    const answerStats = await db
      .select({
        total: count(),
        correct: count(sql`CASE WHEN ${quizAnswers.isCorrect} THEN 1 END`),
      })
      .from(quizAnswers)

    return NextResponse.json({
      success: true,
      data: {
        taskCount: taskCount.count,
        userCount: userCount.count,
        assignmentCount: assignmentCount.count,
        answerTotal: answerStats[0]?.total || 0,
        answerCorrect: answerStats[0]?.correct || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    )
  }
}
