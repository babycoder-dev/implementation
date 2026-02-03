import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskFiles, taskAssignments, quizQuestions, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { createTaskSchema } from '@/lib/validations/task'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const validated = createTaskSchema.parse(body)

    // 创建任务
    const [task] = await db
      .insert(tasks)
      .values({
        title: validated.title,
        description: validated.description,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        createdBy: auth.userId,
      })
      .returning()

    // 创建文件记录
    await db.insert(taskFiles).values(
      validated.files.map((file, index) => ({
        taskId: task.id,
        title: file.title,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileSize: file.fileSize,
        order: index,
      }))
    )

    // 分配用户
    await db.insert(taskAssignments).values(
      validated.assignedUserIds.map((userId) => ({
        taskId: task.id,
        userId,
      }))
    )

    // 创建题目
    if (validated.questions && validated.questions.length > 0) {
      await db.insert(quizQuestions).values(
        validated.questions.map((question) => ({
          taskId: task.id,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
        }))
      )
    }

    return NextResponse.json(
      {
        success: true,
        task,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors?.[0]?.message || '数据验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    console.error('Task creation error:', error)
    return NextResponse.json({ success: false, error: '创建任务失败' }, { status: 500 })
  }
}

// GET - 获取任务列表
export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (userId) {
    // 获取用户分配的任务
    const userTasks = await db
      .select({
        task: tasks,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      .where(eq(taskAssignments.userId, userId))

    return NextResponse.json({ success: true, tasks: userTasks.map((t) => t.task) })
  }

  // 获取所有任务（管理员）
  const allTasks = await db.select().from(tasks)

  return NextResponse.json({ success: true, tasks: allTasks })
}
