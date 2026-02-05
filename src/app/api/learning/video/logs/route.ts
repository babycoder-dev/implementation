import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { videoLogs, videoProgress, taskFiles, tasks } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and, desc } from 'drizzle-orm'

// GET /api/learning/video/logs - 获取视频操作日志
export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const fileId = searchParams.get('fileId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const logConditions = [eq(videoLogs.userId, auth.userId)]
    if (fileId) {
      logConditions.push(eq(videoLogs.fileId, fileId))
    }

    const logs = await db
      .select({
        id: videoLogs.id,
        userId: videoLogs.userId,
        fileId: videoLogs.fileId,
        action: videoLogs.action,
        currentTime: videoLogs.currentTime,
        timestamp: videoLogs.timestamp,
        file: {
          id: taskFiles.id,
          title: taskFiles.title,
          fileType: taskFiles.fileType,
          taskId: taskFiles.taskId,
        },
      })
      .from(videoLogs)
      .innerJoin(taskFiles, eq(videoLogs.fileId, taskFiles.id))
      .innerJoin(tasks, eq(taskFiles.taskId, tasks.id))
      .where(and(...logConditions))
      .orderBy(desc(videoLogs.timestamp))
      .limit(limit)

    const filteredLogs = taskId
      ? logs.filter(l => l.file?.taskId === taskId)
      : logs

    // Get video progress
    const progressConditions = [eq(videoProgress.userId, auth.userId)]
    if (fileId) {
      progressConditions.push(eq(videoProgress.fileId, fileId))
    }

    const progress = await db
      .select({
        fileId: videoProgress.fileId,
        currentTime: videoProgress.currentTime,
        duration: videoProgress.duration,
        lastUpdated: videoProgress.lastUpdated,
        file: {
          id: taskFiles.id,
          title: taskFiles.title,
          taskId: taskFiles.taskId,
        },
      })
      .from(videoProgress)
      .innerJoin(taskFiles, eq(videoProgress.fileId, taskFiles.id))
      .where(and(...progressConditions))

    const filteredProgress = taskId
      ? progress.filter(p => p.file?.taskId === taskId)
      : progress

    return NextResponse.json({
      success: true,
      data: {
        logs: filteredLogs,
        progress: filteredProgress.map((p) => ({
          ...p,
          progressPercent:
            p.duration > 0
              ? Math.round((p.currentTime / p.duration) * 100)
              : 0,
        })),
      },
    })
  } catch (error) {
    console.error('Failed to fetch video logs:', error)
    return NextResponse.json(
      { success: false, error: '获取视频日志失败' },
      { status: 500 }
    )
  }
}
