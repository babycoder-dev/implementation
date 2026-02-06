import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, quizAnswers, quizQuestions, learningLogs, taskFiles } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql, desc, gte } from 'drizzle-orm'
import { subDays } from 'date-fns'

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
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)

    // 总任务数
    const [taskCount] = await db.select({ count: count() }).from(tasks)

    // 总用户数
    const [userCount] = await db.select({ count: count() }).from(users)

    // 总分配数
    const [assignmentCount] = await db.select({ count: count() }).from(taskAssignments)

    // 已完成分配数（通过答题记录估算）
    const [completedAssignments] = await db
      .select({ count: count(sql`DISTINCT ${quizAnswers.userId} || '-' || ${quizAnswers.questionId}`) })
      .from(taskAssignments)
      .innerJoin(quizAnswers, eq(quizAnswers.userId, taskAssignments.userId))

    // 任务完成率
    const completionRate = Number(assignmentCount.count) > 0
      ? Math.round((Number(completedAssignments.count) / Number(assignmentCount.count)) * 100)
      : 0

    // 答题统计
    const answerStats = await db
      .select({
        total: count(),
        correct: count(sql`CASE WHEN ${quizAnswers.isCorrect} THEN 1 END`),
      })
      .from(quizAnswers)

    // 新增用户数（本周）
    const [newUsersThisWeek] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo))

    // 新增任务数（本周）
    const [newTasksThisWeek] = await db
      .select({ count: count() })
      .from(tasks)
      .where(gte(tasks.createdAt, sevenDaysAgo))

    // 活跃学习者（本周有学习记录）
    const [activeLearners] = await db
      .select({ count: count(sql`DISTINCT ${learningLogs.userId}`) })
      .from(learningLogs)
      .where(gte(learningLogs.createdAt, sevenDaysAgo))

    // 总学习时长（秒）
    const [totalLearningDuration] = await db
      .select({ total: count(learningLogs.duration) })
      .from(learningLogs)

    // 平均答题正确率
    const answerCorrectRate = answerStats[0]?.total > 0
      ? Math.round((answerStats[0].correct / answerStats[0].total) * 100)
      : 0

    // 总题目数
    const [questionCount] = await db.select({ count: count() }).from(quizQuestions)

    // 总文件数
    const [fileCount] = await db.select({ count: count() }).from(taskFiles)

    // 最新任务
    const recentTasksResult = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        createdAt: tasks.createdAt,
        status: sql<'active' | 'completed' | 'draft'>`'active'`.as('status'),
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(5)

    // 最新用户
    const recentUsersResult = await db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
        role: users.role,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5)

    // 近期活动
    const recentActivities = await db
      .select({
        id: learningLogs.id,
        userId: learningLogs.userId,
        fileId: learningLogs.fileId,
        actionType: learningLogs.actionType,
        duration: learningLogs.duration,
        createdAt: learningLogs.createdAt,
        username: users.username,
        fileTitle: taskFiles.title,
      })
      .from(learningLogs)
      .innerJoin(users, eq(learningLogs.userId, users.id))
      .innerJoin(taskFiles, eq(learningLogs.fileId, taskFiles.id))
      .orderBy(desc(learningLogs.createdAt))
      .limit(10)

    // 每日答题趋势（最近7天）
    const dailyAnswerStats = await db
      .select({
        date: sql<string>`DATE(${quizAnswers.answeredAt})`,
        total: count(),
        correct: count(sql`CASE WHEN ${quizAnswers.isCorrect} THEN 1 END`),
      })
      .from(quizAnswers)
      .where(gte(quizAnswers.answeredAt, sevenDaysAgo))
      .groupBy(sql`DATE(${quizAnswers.answeredAt})`)
      .orderBy(sql`DATE(${quizAnswers.answeredAt})`)

    // 用户学习进度统计
    const userProgressStats = await db
      .select({
        userId: learningLogs.userId,
        username: users.username,
        totalDuration: sql<number>`SUM(${learningLogs.duration})`,
        activityCount: count(),
      })
      .from(learningLogs)
      .innerJoin(users, eq(learningLogs.userId, users.id))
      .groupBy(learningLogs.userId)
      .orderBy(desc(sql`SUM(${learningLogs.duration})`))
      .limit(5)

    return NextResponse.json({
      success: true,
      data: {
        // 基础统计
        taskCount: taskCount.count,
        userCount: userCount.count,
        assignmentCount: assignmentCount.count,
        answerTotal: answerStats[0]?.total || 0,
        answerCorrect: answerStats[0]?.correct || 0,
        questionCount: questionCount.count,
        fileCount: fileCount.count,
        completionRate: completionRate,
        answerCorrectRate: answerCorrectRate,

        // 增强统计
        newUsersThisWeek: newUsersThisWeek.count,
        newTasksThisWeek: newTasksThisWeek.count,
        activeLearnersThisWeek: activeLearners.count,
        totalLearningMinutes: Math.round((totalLearningDuration.total || 0) / 60),

        // 数据列表
        recentTasks: recentTasksResult,
        recentUsers: recentUsersResult,
        recentActivities: recentActivities.map(a => ({
          id: a.id,
          userId: a.userId,
          fileId: a.fileId,
          actionType: a.actionType,
          duration: a.duration,
          createdAt: a.createdAt.toISOString(),
          username: a.username,
          fileTitle: a.fileTitle,
        })),
        dailyAnswerTrend: dailyAnswerStats.map(d => ({
          date: d.date,
          total: Number(d.total),
          correct: Number(d.correct),
        })),
        topLearners: userProgressStats.map(u => ({
          userId: u.userId,
          username: u.username,
          totalMinutes: Math.round(Number(u.totalDuration) / 60),
          activityCount: Number(u.activityCount),
        })),

        // 趋势
        trend: {
          users: newUsersThisWeek.count > 0 ? `+${newUsersThisWeek.count}` : '+0',
          tasks: newTasksThisWeek.count > 0 ? `+${newTasksThisWeek.count}` : '+0',
          assignments: '+0',
          completionRate: `${completionRate}%`,
          activeLearners: String(activeLearners.count),
        },
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    )
  }
}
