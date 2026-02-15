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

  try {
    // Get department stats
    const deptStats = await db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        userCount: count(users.id),
        assigned: count(taskAssignments.id),
        completed: sql<number>`COALESCE(SUM(CASE WHEN ${quizSubmissions.passed} THEN 1 ELSE 0 END), 0)`,
        avgScore: sql<number>`COALESCE(AVG(${quizSubmissions.score}::numeric), 0)`,
      })
      .from(departments)
      .leftJoin(users, eq(users.departmentId, departments.id))
      .leftJoin(taskAssignments, eq(taskAssignments.userId, users.id))
      .leftJoin(quizSubmissions, eq(quizSubmissions.userId, users.id))
      .groupBy(departments.id, departments.name)
      .orderBy(departments.name)

    const data = deptStats.map(d => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      userCount: Number(d.userCount) || 0,
      assigned: Number(d.assigned) || 0,
      completed: Number(d.completed) || 0,
      completionRate: Number(d.userCount) > 0
        ? Math.round((Number(d.completed) / Number(d.userCount)) * 100)
        : 0,
      avgScore: Math.round(Number(d.avgScore) * 100) / 100,
    }))

    return NextResponse.json({
      success: true,
      data: { departments: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get department report:', error)
    return NextResponse.json({ success: false, error: '获取部门报表失败' }, { status: 500 })
  }
}
