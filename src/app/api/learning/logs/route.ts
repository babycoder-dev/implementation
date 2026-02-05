import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { learningLogs, taskFiles, tasks } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and, desc, or } from 'drizzle-orm'

// GET /api/learning/logs - 获取学习日志
export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const fileId = searchParams.get('fileId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const conditions = [eq(learningLogs.userId, auth.userId)]
    if (fileId) {
      conditions.push(eq(learningLogs.fileId, fileId))
    }

    const logs = await db
      .select({
        id: learningLogs.id,
        userId: learningLogs.userId,
        fileId: learningLogs.fileId,
        pageNum: learningLogs.pageNum,
        actionType: learningLogs.actionType,
        createdAt: learningLogs.createdAt,
        file: {
          id: taskFiles.id,
          title: taskFiles.title,
          fileType: taskFiles.fileType,
          taskId: taskFiles.taskId,
        },
      })
      .from(learningLogs)
      .innerJoin(taskFiles, eq(learningLogs.fileId, taskFiles.id))
      .innerJoin(tasks, eq(taskFiles.taskId, tasks.id))
      .where(and(...conditions))
      .orderBy(desc(learningLogs.createdAt))
      .limit(limit)

    // Filter by taskId in memory if needed (since Drizzle's where with join can be tricky)
    const filteredLogs = taskId
      ? logs.filter(l => l.file?.taskId === taskId)
      : logs

    return NextResponse.json({
      success: true,
      data: filteredLogs,
    })
  } catch (error) {
    console.error('Failed to fetch learning logs:', error)
    return NextResponse.json(
      { success: false, error: '获取学习日志失败' },
      { status: 500 }
    )
  }
}
