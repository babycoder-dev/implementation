import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, quizSubmissions, departments } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql, and, gte, lte } from 'drizzle-orm'
import { z } from 'zod'

// Query validation schema
const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

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
  const params = Object.fromEntries(searchParams)

  // Validate query parameters
  const validation = querySchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: '参数验证失败: ' + validation.error.issues[0]?.message },
      { status: 400 }
    )
  }

  const { startDate, endDate } = validation.data

  // Build date condition
  const dateCondition = []
  if (startDate) {
    dateCondition.push(gte(quizSubmissions.submittedAt, new Date(startDate)))
  }
  if (endDate) {
    dateCondition.push(lte(quizSubmissions.submittedAt, new Date(endDate)))
  }

  try {
    // Get department stats - use subqueries to avoid cartesian product
    const deptStats = await db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        userCount: count(users.id),
        assigned: sql<number>`COALESCE(SUM(DISTINCT ${taskAssignments.id}) FILTER (WHERE ${taskAssignments.id} IS NOT NULL), 0)`,
        completed: sql<number>`COUNT(DISTINCT CASE WHEN ${quizSubmissions.passed} THEN ${quizSubmissions.taskId} END)`,
        avgScore: sql<number>`COALESCE(AVG(${quizSubmissions.score}::numeric) FILTER (WHERE ${quizSubmissions.score} IS NOT NULL), 0)`,
      })
      .from(departments)
      .leftJoin(users, eq(users.departmentId, departments.id))
      .leftJoin(taskAssignments, eq(taskAssignments.userId, users.id))
      .leftJoin(quizSubmissions, and(
        eq(quizSubmissions.userId, users.id),
        ...dateCondition
      ))
      .groupBy(departments.id, departments.name)
      .orderBy(departments.name)

    const data = deptStats.map(d => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      userCount: Number(d.userCount) || 0,
      assigned: Number(d.assigned) || 0,
      completed: Number(d.completed) || 0,
      completionRate: Number(d.assigned) > 0
        ? Math.round((Number(d.completed) / Number(d.assigned)) * 100)
        : 0,
      avgScore: Math.round(Number(d.avgScore) * 100) / 100,
    }))

    return NextResponse.json({
      success: true,
      data: { departments: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get department report:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ success: false, error: '获取部门报表失败' }, { status: 500 })
  }
}
