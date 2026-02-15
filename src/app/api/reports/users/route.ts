import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, quizSubmissions, departments, learningLogs, videoProgress } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql, and, like, gte, lte } from 'drizzle-orm'
import { z } from 'zod'

// Query validation schema
const querySchema = z.object({
  departmentId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const [currentUser] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1)
  if (!currentUser || currentUser.role !== 'admin') {
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

  const { departmentId, search } = validation.data

  try {
    // Build user filter
    const conditions = []
    if (departmentId) {
      conditions.push(eq(users.departmentId, departmentId))
    }
    if (search) {
      conditions.push(like(users.name, `%${search}%`))
    }

    // Get user learning stats
    const userStats = await db
      .select({
        userId: users.id,
        userName: users.name,
        departmentName: departments.name,
        tasksAssigned: count(taskAssignments.id),
        tasksCompleted: sql<number>`COUNT(DISTINCT CASE WHEN ${quizSubmissions.passed} THEN ${quizSubmissions.taskId} END)`,
        avgScore: sql<number>`COALESCE(AVG(${quizSubmissions.score}::numeric), 0)`,
        totalLearningTime: sql<number>`COALESCE(SUM(${learningLogs.duration}), 0) + COALESCE(SUM(${videoProgress.currentTime}), 0)`,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(taskAssignments, eq(taskAssignments.userId, users.id))
      .leftJoin(quizSubmissions, eq(quizSubmissions.userId, users.id))
      .leftJoin(learningLogs, eq(learningLogs.userId, users.id))
      .leftJoin(videoProgress, eq(videoProgress.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(users.id, users.name, departments.name)
      .orderBy(users.name)

    const data = userStats.map(u => ({
      userId: u.userId,
      userName: u.userName,
      departmentName: u.departmentName || '未分配',
      tasksAssigned: Number(u.tasksAssigned) || 0,
      tasksCompleted: Number(u.tasksCompleted) || 0,
      avgScore: Math.round(Number(u.avgScore) * 100) / 100,
      totalLearningTime: Number(u.totalLearningTime) || 0,
    }))

    return NextResponse.json({
      success: true,
      data: { users: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get user report:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ success: false, error: '获取用户报表失败' }, { status: 500 })
  }
}
