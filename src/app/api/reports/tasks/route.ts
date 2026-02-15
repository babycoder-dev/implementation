import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, quizSubmissions, departments } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql, and, gte, lte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const departmentId = searchParams.get('departmentId')

  try {
    // Build date filter
    const dateFilter = startDate && endDate
      ? and(
          gte(tasks.createdAt, new Date(startDate)),
          lte(tasks.createdAt, new Date(endDate))
        )
      : undefined

    // Get tasks with completion stats
    const taskStats = await db
      .select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        deadline: tasks.deadline,
        assigned: count(taskAssignments.id),
        completed: sql<number>`COALESCE(SUM(CASE WHEN ${quizSubmissions.passed} THEN 1 ELSE 0 END), 0)`,
        avgScore: sql<number>`COALESCE(AVG(${quizSubmissions.score}::numeric), 0)`,
      })
      .from(tasks)
      .leftJoin(taskAssignments, eq(taskAssignments.taskId, tasks.id))
      .leftJoin(quizSubmissions, and(
        eq(quizSubmissions.taskId, tasks.id),
        eq(quizSubmissions.userId, taskAssignments.userId)
      ))
      .leftJoin(users, eq(taskAssignments.userId, users.id))
      .where(dateFilter ? and(dateFilter, departmentId ? eq(users.departmentId, departmentId) : undefined) : undefined)
      .groupBy(tasks.id, tasks.title, tasks.deadline)
      .orderBy(tasks.createdAt)

    const data = taskStats.map(t => ({
      taskId: t.taskId,
      taskTitle: t.taskTitle,
      deadline: t.deadline?.toISOString() || null,
      assigned: Number(t.assigned) || 0,
      completed: Number(t.completed) || 0,
      completionRate: Number(t.assigned) > 0
        ? Math.round((Number(t.completed) / Number(t.assigned)) * 100)
        : 0,
      avgScore: Math.round(Number(t.avgScore) * 100) / 100,
    }))

    return NextResponse.json({
      success: true,
      data: { tasks: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get task report:', error)
    return NextResponse.json({ success: false, error: '获取任务报表失败' }, { status: 500 })
  }
}
