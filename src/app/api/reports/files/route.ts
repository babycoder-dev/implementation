import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, taskFiles, learningLogs, videoProgress } from '@/db/schema'
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
  const taskId = searchParams.get('taskId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    // Get file stats
    const conditions = []
    if (taskId) {
      conditions.push(eq(taskFiles.taskId, taskId))
    }

    const fileStats = await db
      .select({
        fileId: taskFiles.id,
        fileName: taskFiles.title,
        fileType: taskFiles.fileType,
        totalAssigned: count(taskAssignments.id),
        viewCount: sql<number>`COALESCE(SUM(CASE WHEN ${learningLogs.actionType} = 'open' THEN 1 ELSE 0 END), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${learningLogs.duration}), 0)`,
        videoViewCount: sql<number>`COUNT(DISTINCT ${videoProgress.id})`,
        videoAvgTime: sql<number>`COALESCE(AVG(${videoProgress.currentTime}), 0)`,
      })
      .from(taskFiles)
      .leftJoin(taskAssignments, eq(taskAssignments.taskId, taskFiles.taskId))
      .leftJoin(learningLogs, eq(learningLogs.fileId, taskFiles.id))
      .leftJoin(videoProgress, eq(videoProgress.fileId, taskFiles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(taskFiles.id, taskFiles.title, taskFiles.fileType)
      .orderBy(taskFiles.title)

    const data = fileStats.map(f => ({
      fileId: f.fileId,
      fileName: f.fileName,
      fileType: f.fileType,
      viewCount: Number(f.viewCount) + Number(f.videoViewCount),
      avgDuration: f.fileType === 'video'
        ? Math.round(Number(f.videoAvgTime))
        : Math.round(Number(f.avgDuration)),
      completionRate: Number(f.totalAssigned) > 0
        ? Math.round((Number(f.viewCount) / Number(f.totalAssigned)) * 100)
        : 0,
    }))

    return NextResponse.json({
      success: true,
      data: { files: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get file report:', error)
    return NextResponse.json({ success: false, error: '获取文件报表失败' }, { status: 500 })
  }
}
