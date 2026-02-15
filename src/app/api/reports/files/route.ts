import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, taskFiles, learningLogs, videoProgress } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql, and, gte, lte } from 'drizzle-orm'
import { z } from 'zod'

// Query validation schema
const querySchema = z.object({
  taskId: z.string().uuid().optional(),
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

  const { taskId, startDate, endDate } = validation.data

  try {
    // Build conditions
    const conditions = []
    if (taskId) {
      conditions.push(eq(taskFiles.taskId, taskId))
    }

    // Date filter conditions for learning logs
    const dateConditions = []
    if (startDate) {
      dateConditions.push(gte(learningLogs.createdAt, new Date(startDate)))
    }
    if (endDate) {
      dateConditions.push(lte(learningLogs.createdAt, new Date(endDate)))
    }

    const fileStats = await db
      .select({
        fileId: taskFiles.id,
        fileName: taskFiles.title,
        fileType: taskFiles.fileType,
        totalAssigned: count(taskAssignments.id),
        pdfViewCount: sql<number>`COUNT(DISTINCT ${learningLogs.userId})`,
        pdfAvgDuration: sql<number>`COALESCE(AVG(${learningLogs.duration}), 0)`,
        videoViewCount: sql<number>`COUNT(DISTINCT ${videoProgress.userId})`,
        videoAvgTime: sql<number>`COALESCE(AVG(${videoProgress.currentTime}), 0)`,
      })
      .from(taskFiles)
      .leftJoin(taskAssignments, eq(taskAssignments.taskId, taskFiles.taskId))
      .leftJoin(learningLogs, and(
        eq(learningLogs.fileId, taskFiles.id),
        ...dateConditions
      ))
      .leftJoin(videoProgress, eq(videoProgress.fileId, taskFiles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(taskFiles.id, taskFiles.title, taskFiles.fileType)
      .orderBy(taskFiles.title)

    const data = fileStats.map(f => ({
      fileId: f.fileId,
      fileName: f.fileName,
      fileType: f.fileType,
      viewCount: Number(f.pdfViewCount) + Number(f.videoViewCount),
      avgDuration: f.fileType === 'video'
        ? Math.round(Number(f.videoAvgTime))
        : Math.round(Number(f.pdfAvgDuration)),
      completionRate: Number(f.totalAssigned) > 0
        ? Math.round(((Number(f.pdfViewCount) + Number(f.videoViewCount)) / Number(f.totalAssigned)) * 100)
        : 0,
    }))

    return NextResponse.json({
      success: true,
      data: { files: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get file report:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ success: false, error: '获取文件报表失败' }, { status: 500 })
  }
}
