import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  users,
  taskAssignments,
  quizQuestions,
  quizAnswers,
  taskFiles,
  videoProgress,
} from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    // Get target userId from query parameter (admin only) or use current user
    const { searchParams } = new URL(request.url)
    const queryUserId = searchParams.get('userId')

    let targetUserId = auth.userId

    // If userId query parameter is provided, verify admin permission
    if (queryUserId) {
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, auth.userId))
        .limit(1)

      if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: '需要管理员权限' },
          { status: 403 }
        )
      }

      targetUserId = queryUserId
    }

    // Get total assigned tasks for the user
    const [assignedResult] = await db
      .select({ count: count() })
      .from(taskAssignments)
      .where(eq(taskAssignments.userId, targetUserId))

    const totalTasks = assignedResult?.count || 0

    // Calculate completed tasks (tasks where all files have been viewed/videos watched)
    // For simplicity, we consider a task completed if the user has at least one learning log or video progress entry
    // for each file in the assigned tasks
    const completedTasksResult = await db.execute(sql`
      SELECT COUNT(DISTINCT ta.task_id) as completed_count
      FROM ${taskAssignments} ta
      WHERE ta.user_id = ${targetUserId}
      AND NOT EXISTS (
        SELECT 1 FROM ${taskFiles} tf
        WHERE tf.task_id = ta.task_id
        AND NOT EXISTS (
          SELECT 1 FROM ${videoProgress} vp
          WHERE vp.file_id = tf.id AND vp.user_id = ${targetUserId}
        )
        AND tf.file_type = 'video'
      )
    `)
    const completedTasks =
      (completedTasksResult[0]?.completed_count as number) || 0

    // Get quiz stats for the user
    // Get total questions from tasks assigned to the user
    const [totalQuestionsResult] = await db
      .select({ count: count() })
      .from(quizQuestions)
      .innerJoin(
        taskAssignments,
        eq(taskAssignments.taskId, quizQuestions.taskId)
      )
      .where(eq(taskAssignments.userId, targetUserId))

    const totalQuestions = totalQuestionsResult?.count || 0

    // Get answered questions count
    const [answeredResult] = await db
      .select({ count: count() })
      .from(quizAnswers)
      .where(eq(quizAnswers.userId, targetUserId))

    const answeredCount = answeredResult?.count || 0

    // Get correct answers count
    const [correctResult] = await db
      .select({
        count: count(),
      })
      .from(quizAnswers)
      .where(
        sql`${quizAnswers.userId} = ${targetUserId} AND ${quizAnswers.isCorrect} = true`
      )

    const correctCount = correctResult?.count || 0

    // Get video stats for the user
    // Get total videos from task files in assigned tasks
    const [totalVideosResult] = await db
      .select({ count: count() })
      .from(taskFiles)
      .innerJoin(taskAssignments, eq(taskAssignments.taskId, taskFiles.taskId))
      .where(
        sql`${taskAssignments.userId} = ${targetUserId} AND ${taskFiles.fileType} = 'video'`
      )

    const totalVideos = totalVideosResult?.count || 0

    // Get watched videos count (videos with progress entries)
    const [watchedResult] = await db
      .select({ count: count() })
      .from(videoProgress)
      .where(eq(videoProgress.userId, targetUserId))

    const watchedCount = watchedResult?.count || 0

    // Get total watch time (sum of currentTime from video progress)
    const [watchTimeResult] = await db
      .select({
        totalTime: sql<number>`COALESCE(SUM(${videoProgress.currentTime}), 0)`,
      })
      .from(videoProgress)
      .where(eq(videoProgress.userId, targetUserId))

    const totalWatchTime = watchTimeResult?.totalTime || 0

    return NextResponse.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        quizStats: {
          totalQuestions,
          answeredCount,
          correctCount,
        },
        videoStats: {
          totalVideos,
          watchedCount,
          totalWatchTime,
        },
      },
    })
  } catch (error) {
    console.error('Failed to get learning progress:', error)
    return NextResponse.json(
      { success: false, error: '获取学习进度失败' },
      { status: 500 }
    )
  }
}
